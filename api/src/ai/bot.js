import { cfg } from '../config.js';
import { CATEGORY_LABEL } from '../constants.js';
import { priorityToCw } from '../chatwoot/statusMap.js';
import { deps } from '../deps.js';
import { topArticles } from '../kb/retrieve.js';
import { log } from '../lib/log.js';
import { Message } from '../models/Message.js';
import { Ticket } from '../models/Ticket.js';
import * as sla from '../sla/sla.js';
import { notify } from '../notifications/service.js';
import { SYSTEM_TEXT, emitMessage, emitTicket, findTicket, setPendingAction, upsertChatwootMessage } from '../tickets/service.js';
import { buildMessages } from './prompt.js';
import { enqueue } from './queue.js';
import { AiOutput } from './schema.js';
import { decideTier } from './tier.js';
import { maxPriority, priorityFloor, scanKeywords } from './triggers.js';

const CATEGORY_LABELS = new Set(Object.values(CATEGORY_LABEL));
const uniq = (a) => [...new Set(a)];
const pct = (n) => `${Math.round((n ?? 0) * 100)}%`;

// E21: agent-bot webhook (§5.5)
export async function handleBotEvent(p) {
  if (p.event !== 'message_created') return;
  if (p.message_type !== 'incoming' || p.private) return;
  if (p.conversation?.status !== 'pending') return;
  const t = await findTicket(p.conversation);
  if (!t) {
    log.warn({ evt: 'bot_ticket_not_found', conversationId: p.conversation?.id, ticket: p.conversation?.custom_attributes?.ticket_number ?? null });
    return;
  }
  await Ticket.updateOne({ _id: t._id }, { $set: { 'ai.pendingSince': new Date() } });   // newest unanswered message time
  enqueue(String(t._id), () => run(t._id, { labels: p.conversation.labels ?? [] }));
}

export async function run(ticketId, { labels = [] } = {}) {
  const started = Date.now();
  const runStart = new Date();
  // conditional clear: a customer message stored during this run keeps its newer pendingSince and gets its own run
  const clearPending = () => Ticket.updateOne({ _id: ticketId, 'ai.pendingSince': { $lte: runStart } }, { $set: { 'ai.pendingSince': null } });
  const t = await Ticket.findById(ticketId);
  if (!t || t.chatwoot.syncState !== 'synced') return null;                  // keep pendingSince: sweep retries after sync
  if (t.status !== 'ai_handling' || t.ai.humanRequested) { await clearPending(); return null; }
  if (!t.ai.pendingSince) return null;                                       // nothing unanswered (duplicate webhook/sweep)

  const history = (await Message.find({ ticketId }).sort({ createdAt: 1 }).limit(500)).filter((m) => m.author !== 'system').slice(-10);
  const customerText = history.filter((m) => m.author === 'customer').map((m) => m.body);
  const articles = await topArticles(`${t.subject} ${customerText.at(-1) ?? ''}`, 3, t.locale ?? 'en');
  let out = null, errCode = null;
  try {
    out = AiOutput.parse(await deps.groq.complete(buildMessages('ticket', t, articles, history)));
  } catch (e) {
    errCode = String(e.code ?? e.name ?? e.message).slice(0, 100);
  }
  const failed = !out;
  const triggers = uniq([...(out?.triggers ?? []), ...scanKeywords([t.subject, ...customerText].join('\n'))]);
  let priority = maxPriority(out?.priority ?? t.priority, priorityFloor(triggers));
  if (failed && !triggers.length) priority = t.priority;
  const allowed = new Set(articles.map((a) => a.slug));
  const validSources = uniq((out?.sources ?? []).filter((s) => allowed.has(s)));
  let { tier, reason } = decideTier({ failed, triggers, priority, autoCount: t.ai.autoCount, confidence: out?.confidence ?? 0,
    validSources, answer: out?.answer ?? '' }, cfg);
  const category = out?.category && out.category !== 'General' ? out.category : t.category;
  const sources = validSources.map((s) => ({ slug: s, title: articles.find((a) => a.slug === s).title }));
  const due = sla.dueDates(t.createdAt, priority);
  const convId = t.chatwoot.conversationId;
  const now = new Date();
  const emitted = [];

  // 1) Persist the decision FIRST (no status guard) so a racing status webhook cannot discard it
  await Ticket.updateOne({ _id: ticketId }, { $set: { priority, category, 'sla.responseDueAt': due.responseDueAt,
    'sla.resolutionDueAt': due.resolutionDueAt, 'ai.tier': tier, 'ai.intent': out?.intent ?? 'unknown',
    'ai.confidence': out?.confidence ?? null, 'ai.triggers': triggers, 'ai.summary': out?.summary ?? '', 'ai.lastRunAt': now,
    'ai.lastError': failed ? errCode : null } });

  // 2) For draft/human, move status before telling Chatwoot (the echoing status webhook then becomes a no-op)
  const toHuman = async () => {
    const r = await Ticket.updateOne({ _id: ticketId, status: 'ai_handling' }, { $set: { status: 'in_progress', 'ai.awaitingAcceptance': false },
      $push: { statusHistory: { status: 'in_progress', at: new Date(), by: 'ai' } } });
    await clearPending();
    if (r.matchedCount === 1) {
      emitted.push(await Message.create({ ticketId, author: 'system', authorName: 'SmartCC', body: SYSTEM_TEXT[t.locale ?? 'en'].handedOff }));
    }
  };
  if (tier !== 'auto') await toHuman();

  // 3) Chatwoot side effects (bot token), in order
  const c = deps.chatwoot;
  let cwMsg;
  try {
    const slaDue = t.sla.firstResponseAt || tier === 'auto' ? due.resolutionDueAt : due.responseDueAt;
    await c.setCustomAttributes(convId, { ticket_number: t.number, ai_tier: tier, ai_confidence: Math.round((out?.confidence ?? 0) * 100) / 100,
      sla_due_at: slaDue.toISOString() });
    // always set (idempotent): conversations are created without a priority, so an unchanged 'medium' must still reach the agent (REQ-017)
    await c.togglePriority(convId, priorityToCw[priority]);
    // keep one category label (the current one) so the label→category mapping stays unambiguous
    const merged = uniq([...labels, ...t.chatwoot.labels, CATEGORY_LABEL[category], `ai-${tier}`])
      .filter((l) => !CATEGORY_LABELS.has(l) || l === CATEGORY_LABEL[category]);
    const applied = await c.setLabels(convId, merged);
    await Ticket.updateOne({ _id: ticketId }, { $set: { 'chatwoot.labels': Array.isArray(applied) ? applied : merged } });
    const titles = sources.map((s) => s.title).join('; ');
    if (tier === 'auto') {
      cwMsg = await c.createMessage(convId, { content: `${out.answer}\n\n— AI assistant · Sources: ${titles}` }, 'bot');
    } else {
      await c.createMessage(convId, { isPrivate: true, content: tier === 'draft'
        ? `AI draft (confidence ${pct(out.confidence)}) — review before sending:\n\n${out.answer}\n\nSources: ${titles || 'none'}`
        : `AI hand-off — ${reason}\nIntent: ${out?.intent ?? 'unknown'} · Priority: ${priority}\nTriggers: ${triggers.join(', ') || 'none'}\nSummary: ${out?.summary || '(AI unavailable)'}` }, 'bot');
      await c.toggleStatus(convId, 'open', 'bot');              // Chatwoot bot_handoff!
    }
  } catch (e) {
    log.warn({ evt: 'bot_chatwoot_error', ticket: t.number, err: e.message });
    if (tier === 'auto') {
      tier = 'human'; reason = 'chatwoot_error';
      await Ticket.updateOne({ _id: ticketId }, { $set: { 'ai.tier': 'human' } });
      await toHuman();
    }
    await setPendingAction(t, 'handoff');   // worker replays note + toggle_status open (bot) until Chatwoot accepts
    for (const m of emitted) emitMessage(t, m);
    await emitTicket(ticketId);
    log.info({ evt: 'ai_decision', ticket: t.number, tier, reason, confidence: out?.confidence ?? null, triggers, latencyMs: Date.now() - started });
    return { tier, reason };
  }

  // 4) Auto-tier bookkeeping (guarded: skip if a human took over meanwhile)
  if (tier === 'auto') {
    await upsertChatwootMessage(t, cwMsg, { author: 'ai', authorName: 'AI assistant' });
    emitted.push(await Message.findOneAndUpdate({ chatwootMessageId: cwMsg.id },
      { $set: { body: out.answer, sources, author: 'ai', authorName: 'AI assistant' } }, { new: true }));
    await clearPending();
    const awaiting = await Ticket.updateOne({ _id: ticketId, status: 'ai_handling' }, { $set: { 'ai.awaitingAcceptance': true, lastMessageAt: now }, $inc: { 'ai.autoCount': 1 } });
    await Ticket.updateOne({ _id: ticketId, 'sla.firstResponseAt': null }, { $set: { 'sla.firstResponseAt': now } });
    if (awaiting.modifiedCount) await notify(t, 'ai_answer');
  }
  for (const m of emitted) emitMessage(t, m);
  await emitTicket(ticketId);
  log.info({ evt: 'ai_decision', ticket: t.number, tier, reason, confidence: out?.confidence ?? null, triggers, latencyMs: Date.now() - started });
  return { tier, reason };
}
