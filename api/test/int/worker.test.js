import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { pending } from '../../src/ai/queue.js';
import { Message } from '../../src/models/Message.js';
import { Ticket } from '../../src/models/Ticket.js';
import { sweepSla, tick } from '../../src/sync/worker.js';
import * as svc from '../../src/tickets/service.js';
import { newTicket, setup, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, cw, groq, a;
beforeAll(async () => { await startDb(); ({ app, chatwoot: cw, groq } = await setup()); a = await signUp(app); });
afterAll(stopDb);
beforeEach(() => { cw.reset(); groq.calls = 0; groq.fail = null; });

const ticket = async (o) => Ticket.findOne({ number: (await newTicket(a, o).expect(201)).body.ticket.number });

test('bot recovery: pendingSince older than 60 s and synced is re-run once', async () => {
  const t = await ticket();
  groq.fail = new Error('down');
  await Ticket.updateOne({ _id: t._id }, { $set: { 'ai.pendingSince': new Date(Date.now() - 61_000) } });
  const fresh = await ticket({ subject: 'Fresh one here' });          // pendingSince = now → not swept
  await tick();
  await until(() => pending() === 0 && groq.calls === 1);
  expect((await Ticket.findById(t._id)).ai).toMatchObject({ tier: 'human', pendingSince: null });
  expect((await Ticket.findById(fresh._id)).ai.lastRunAt).toBeNull();
  await tick();
  await until(() => pending() === 0);
  expect(groq.calls).toBe(1);
});

test('SLA breach: breachedAt set and label sla-breached merged once', async () => {
  const t = await ticket({ subject: 'Breach me please' });
  const past = new Date(Date.now() - 60_000);
  await Ticket.updateOne({ _id: t._id }, { $set: { createdAt: new Date(Date.now() - 300 * 60000), 'sla.responseDueAt': past, 'chatwoot.labels': ['billing'] } });
  await sweepSla();
  const u = await Ticket.findById(t._id);
  expect(u.sla.breachedAt).toBeTruthy();
  expect(cw.named('setLabels')).toEqual([['setLabels', u.chatwoot.conversationId, ['billing', 'sla-breached']]]);
  expect(u.chatwoot.labels).toEqual(['billing', 'sla-breached']);
  await sweepSla();
  expect(cw.named('setLabels')).toHaveLength(1);
});

test('reconcile inserts missing outgoing public messages only (message_type 1)', async () => {
  const t = await ticket({ subject: 'Reconcile this one' });
  const now = Date.now() / 1000;
  cw.conversation = { id: t.chatwoot.conversationId, status: 'open', priority: 'high', labels: [], updated_at: now, custom_attributes: {} };
  cw.messages = [
    { id: 501, message_type: 0, private: false, content: 'incoming', created_at: now },
    { id: 502, message_type: 1, private: false, content: 'Agent reply', created_at: now, sender: { name: 'Ravi', type: 'user' } },
    { id: 503, message_type: 1, private: true, content: 'note', created_at: now },
    { id: 504, message_type: 2, private: false, content: 'activity', created_at: now },
    { id: 505, message_type: 1, private: false, content: 'Bot reply', created_at: now, sender: { type: 'agent_bot' }, sender_type: 'AgentBot' },
  ];
  await svc.reconcile(t);
  const msgs = await Message.find({ ticketId: t._id, chatwootMessageId: { $ne: null } }).sort({ chatwootMessageId: 1 });
  expect(msgs.map((m) => [m.chatwootMessageId, m.author, m.authorName])).toEqual([[502, 'agent', 'Ravi'], [505, 'ai', 'AI assistant']]);
  expect(await Ticket.findById(t._id)).toMatchObject({ status: 'in_progress', priority: 'high' });
  await svc.reconcile(t);
  expect(await Message.countDocuments({ ticketId: t._id, chatwootMessageId: { $ne: null } })).toBe(2);
});

test('pending actions replayed in order and pulled', async () => {
  const t = await ticket({ subject: 'Replay actions here' });
  await Ticket.updateOne({ _id: t._id }, { $set: { 'chatwoot.pendingActions': ['handoff'], 'ai.humanRequested': true } });
  cw.down = true;
  await tick();
  expect((await Ticket.findById(t._id)).chatwoot.pendingActions).toEqual(['handoff']);
  cw.down = false;
  await tick();
  expect((await Ticket.findById(t._id)).chatwoot.pendingActions).toEqual([]);
  expect(cw.calls.filter((c) => ['createMessage', 'toggleStatus'].includes(c[0])).slice(-2)).toEqual([
    ['createMessage', t.chatwoot.conversationId, { content: 'Customer requested a human agent.', isPrivate: true }, 'bot'],
    ['toggleStatus', t.chatwoot.conversationId, 'open', 'bot']]);
});
