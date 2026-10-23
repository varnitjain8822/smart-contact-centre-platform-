import { cfg } from '../config.js';
import { deps } from '../deps.js';
import * as bot from '../ai/bot.js';
import { sweepOrphans } from '../attachments/service.js';
import { notify } from '../notifications/service.js';
import { enqueue } from '../ai/queue.js';
import { log } from '../lib/log.js';
import { Message } from '../models/Message.js';
import { Ticket } from '../models/Ticket.js';
import * as sla from '../sla/sla.js';
import * as svc from '../tickets/service.js';

let running = false, ticks = 0, timer = null;

export function start() { timer = setInterval(() => tick().catch((e) => log.error({ evt: 'worker_error', err: e.message })), cfg.SYNC_INTERVAL_MS); }
export function stop() { clearInterval(timer); }

export async function tick() {
  if (running) return;                                   // previous tick still running
  running = true;
  try {
    const now = new Date();
    // 1. deferred ticket delivery
    for (const t of await Ticket.find({ 'chatwoot.syncState': 'pending', 'chatwoot.nextAttemptAt': { $lte: now } }).limit(20)) {
      await svc.syncTicket(t).catch((e) => svc.markRetry(t, e));
    }
    // 2. deferred customer messages (only once their ticket is synced)
    for (const m of await Message.find({ syncState: 'pending', nextAttemptAt: { $lte: now } }).sort({ createdAt: 1 }).limit(50)) {
      const t = await Ticket.findById(m.ticketId);
      if (t?.chatwoot.syncState === 'synced') await svc.syncMessage(m, t).catch((e) => svc.markMsgRetry(m, e));
    }
    // 3. replay Chatwoot side of customer actions / bot hand-offs
    for (const t of await Ticket.find({ 'chatwoot.pendingActions.0': { $exists: true }, 'chatwoot.syncState': 'synced' }).limit(20)) {
      for (const kind of t.chatwoot.pendingActions) {
        try {
          await svc.ACTIONS[kind](t);
          await Ticket.updateOne({ _id: t._id }, { $pull: { 'chatwoot.pendingActions': kind } });
        } catch (e) { log.warn({ evt: 'sync_retry', ticket: t.number, action: kind, err: e.message }); }
      }
    }
    // 4. bot recovery: unanswered customer message older than 60 s
    for (const t of await Ticket.find({ status: 'ai_handling', 'ai.pendingSince': { $lte: new Date(now - 60_000) }, 'chatwoot.syncState': 'synced' }).limit(10)) {
      enqueue(String(t._id), () => bot.run(t._id, { labels: t.chatwoot.labels }));
    }
    // 5. SLA breach sweep every 2nd tick
    if (++ticks % 2 === 0) await sweepSla(now);
    // 6. abandoned uploads, every 20th tick
    if (ticks % 20 === 0) await sweepOrphans(now).catch((e) => log.warn({ evt: 'orphan_sweep_failed', err: e.message }));
  } finally {
    running = false;
  }
}

export async function sweepSla(now = new Date()) {
  for (const t of await Ticket.find({ status: { $ne: 'resolved' }, 'sla.breachedAt': null })) {
    if (sla.state(t, now) !== 'breached') continue;
    const r = await Ticket.updateOne({ _id: t._id, 'sla.breachedAt': null }, { $set: { 'sla.breachedAt': now } });
    if (!r.modifiedCount) continue;
    if (t.chatwoot.conversationId != null) {
      const labels = [...new Set([...t.chatwoot.labels, 'sla-breached'])];
      try {
        const applied = await deps.chatwoot.setLabels(t.chatwoot.conversationId, labels);
        await Ticket.updateOne({ _id: t._id }, { $set: { 'chatwoot.labels': Array.isArray(applied) ? applied : labels } });
      } catch (e) { log.warn({ evt: 'sla_label_failed', ticket: t.number, err: e.message }); }
    }
    log.info({ evt: 'sla_breached', ticket: t.number });
    await svc.emitTicket(t._id);
    await notify(t, 'sla_breach');
  }
}
