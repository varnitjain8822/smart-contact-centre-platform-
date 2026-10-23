import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import * as realGroq from '../../src/ai/groq.js';
import { pending } from '../../src/ai/queue.js';
import { deps } from '../../src/deps.js';
import { AiError } from '../../src/lib/errors.js';
import { Message } from '../../src/models/Message.js';
import { Ticket } from '../../src/models/Ticket.js';
import { newTicket, setup, signed, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, cw, groq, a;
beforeAll(async () => { await startDb(); ({ app, chatwoot: cw, groq } = await setup()); a = await signUp(app); });
afterAll(stopDb);
beforeEach(() => { cw.reset(); groq.out = null; groq.fail = null; groq.calls = 0; deps.groq = groq; });

const SLUG = 'payment-pending-subscription-not-active';
const ai = (o = {}) => ({ intent: 'payment_pending', category: 'Billing', priority: 'medium', confidence: 0.92, triggers: [],
  answer: 'Payments usually activate within 30 minutes.', sources: [SLUG], summary: 'Customer paid, plan inactive.', ...o });

async function ticket(o) {
  const r = await newTicket(a, o).expect(201);
  cw.reset();
  return Ticket.findOne({ number: r.body.ticket.number });
}
const botHook = (t, o = {}) => signed(app, '/bot/chatwoot', { event: 'message_created', message_type: 'incoming', private: false, content: 'x',
  conversation: { id: t.chatwoot.conversationId, status: 'pending', labels: [], custom_attributes: { ticket_number: t.number } }, ...o }, 'bot-secret').expect(200);
async function runBot(t, o) {
  const before = (await Ticket.findById(t._id)).ai.lastRunAt?.getTime() ?? 0;
  await botHook(t, o);
  await until(async () => ((await Ticket.findById(t._id)).ai.lastRunAt?.getTime() ?? 0) > before && pending() === 0);
  return Ticket.findById(t._id);
}

test('auto: outgoing reply with bot token; AI message stored with sources; awaiting acceptance', async () => {
  groq.out = ai();
  const t = await runBot(await ticket());
  expect(t.ai).toMatchObject({ tier: 'auto', confidence: 0.92, autoCount: 1, awaitingAcceptance: true, pendingSince: null, lastError: null });
  expect(t.status).toBe('ai_handling');
  expect(t.sla.firstResponseAt).toBeTruthy();
  const [, convId, body, as] = cw.named('createMessage')[0];
  expect(convId).toBe(t.chatwoot.conversationId);
  expect(as).toBe('bot');
  expect(body.content).toBe('Payments usually activate within 30 minutes.\n\n— AI assistant · Sources: Payment Pending / Subscription Not Active');
  expect(body.isPrivate).toBeUndefined();
  const m = await Message.findOne({ ticketId: t._id, author: 'ai' });
  expect(m).toMatchObject({ authorName: 'AI assistant', body: 'Payments usually activate within 30 minutes.' });
  const q = await Message.findOne({ ticketId: t._id, author: 'customer' });
  expect(m.createdAt.getTime()).toBeGreaterThanOrEqual(q.createdAt.getTime());   // whole-second created_at must not sort the answer above the question
  expect(m.sources.map((s) => ({ slug: s.slug, title: s.title }))).toEqual([{ slug: SLUG, title: 'Payment Pending / Subscription Not Active' }]);
  expect(cw.named('setLabels')[0][2]).toEqual(expect.arrayContaining(['billing', 'ai-auto']));
  expect(cw.named('setCustomAttributes')[0][2]).toMatchObject({ ticket_number: t.number, ai_tier: 'auto', ai_confidence: 0.92 });
  expect(cw.named('toggleStatus')).toHaveLength(0);
  expect(groq.last[0].role).toBe('system');
  const detail = (await a.get(`/api/tickets/${t.number}`).expect(200)).body.ticket;
  expect(detail.actions.canAccept).toBe(true);
  expect(detail.aiTier).toBe('auto');
});

test('webhook echo + bot enrichment are order-independent', async () => {
  groq.out = ai();
  const t = await runBot(await ticket());
  const cwId = cw.named('createMessage')[0];
  const m = await Message.findOne({ ticketId: t._id, author: 'ai' });
  // the inbox webhook for the same Chatwoot message arrives later → no duplicate, enrichment kept
  await signed(app, '/webhooks/chatwoot', { event: 'message_created', id: m.chatwootMessageId, message_type: 'outgoing', private: false,
    content: 'raw', created_at: new Date().toISOString(), sender: { type: 'agent_bot' }, conversation: { id: t.chatwoot.conversationId } }, 'inbox-secret').expect(200);
  await new Promise((r) => setTimeout(r, 80));
  expect(await Message.countDocuments({ chatwootMessageId: m.chatwootMessageId })).toBe(1);
  expect((await Message.findById(m._id)).body).toBe('Payments usually activate within 30 minutes.');
  expect(cwId).toBeTruthy();
});

test('draft → private note + toggle open (bot); status in_progress + system message', async () => {
  groq.out = ai({ confidence: 0.7 });
  const t = await runBot(await ticket());
  expect(t.ai.tier).toBe('draft');
  expect(t.status).toBe('in_progress');
  expect(t.statusHistory.at(-1)).toMatchObject({ status: 'in_progress', by: 'ai' });
  const [, , note, as] = cw.named('createMessage')[0];
  expect(as).toBe('bot');
  expect(note.isPrivate).toBe(true);
  expect(note.content).toMatch(/^AI draft \(confidence 70%\) — review before sending:/);
  expect(cw.named('toggleStatus')[0]).toEqual(['toggleStatus', t.chatwoot.conversationId, 'open', 'bot']);
  expect(cw.named('togglePriority')[0]).toEqual(['togglePriority', t.chatwoot.conversationId, 'medium']);   // unchanged priority still shown to agent
  expect(await Message.findOne({ ticketId: t._id, author: 'system' })).toMatchObject({ body: "We've passed this to our support team. An agent will reply here." });
});

test('keyword trigger at 0.95 → human + priority floor critical', async () => {
  groq.out = ai({ confidence: 0.95 });
  const t = await runBot(await ticket({ subject: 'Account problem now', description: 'Someone hacked my account and changed the email.' }));
  expect(t.ai.tier).toBe('human');
  expect(t.ai.triggers).toContain('account_takeover');
  expect(t.priority).toBe('critical');
  expect(t.sla.responseDueAt - t.createdAt).toBe(15 * 60000);
  expect(cw.named('togglePriority')[0]).toEqual(['togglePriority', t.chatwoot.conversationId, 'urgent']);
  expect(cw.named('createMessage')[0][2].content).toMatch(/^AI hand-off — triggers:account_takeover/);
});

test('Groq failure → human ai_unavailable; no key → human', async () => {
  groq.fail = new AiError('http_429');
  let t = await runBot(await ticket());
  expect(t.ai).toMatchObject({ tier: 'human', lastError: 'http_429' });
  expect(t.priority).toBe('medium');
  expect(cw.named('createMessage')[0][2].content).toMatch(/^AI hand-off — ai_unavailable/);
  deps.groq = realGroq;                       // GROQ_API_KEY empty in tests
  t = await runBot(await ticket());
  expect(t.ai).toMatchObject({ tier: 'human', lastError: 'not_configured' });
  expect(t.status).toBe('in_progress');
});

test('unknown slug dropped → draft', async () => {
  groq.out = ai({ confidence: 0.95, sources: ['made-up-article'] });
  expect((await runBot(await ticket())).ai.tier).toBe('draft');
});

test('decision fields persisted even if the status webhook echo lands first', async () => {
  const t0 = await ticket();
  groq.out = async () => {
    await signed(app, '/webhooks/chatwoot', { event: 'conversation_status_changed', id: t0.chatwoot.conversationId, status: 'open',
      priority: null, labels: [], updated_at: Date.now() / 1000, custom_attributes: {} }, 'inbox-secret').expect(200);
    await until(async () => (await Ticket.findById(t0._id)).status === 'in_progress');
    return ai({ confidence: 0.7 });
  };
  const t = await runBot(t0);
  expect(t.ai).toMatchObject({ tier: 'draft', confidence: 0.7, intent: 'payment_pending' });
  expect(t.status).toBe('in_progress');
  expect(await Message.countDocuments({ ticketId: t._id, author: 'system' })).toBe(0);   // agent moved it; no duplicate notice
});

test('mid-run customer message gets its own serialised run', async () => {
  const t0 = await ticket();
  let first = true;
  groq.out = async (messages) => {
    if (first) {
      first = false;
      await a.post(`/api/tickets/${t0.number}/messages`).send({ body: 'Also the invoice is missing', clientMessageId: randomUUID() }).expect(201);
      await botHook(t0);
      await new Promise((r) => setTimeout(r, 50));
    }
    return ai({ answer: messages[1].content.includes('invoice is missing') ? 'second' : 'first' });
  };
  await botHook(t0);
  await until(async () => groq.calls === 2 && pending() === 0);
  const t = await Ticket.findById(t0._id);
  expect(t.ai.autoCount).toBe(2);
  expect(t.ai.pendingSince).toBeNull();
  expect((await Message.find({ ticketId: t._id, author: 'ai' }).sort({ createdAt: 1 })).map((m) => m.body)).toEqual(['first', 'second']);
});

test('Chatwoot failure during hand-off adds pendingActions handoff', async () => {
  groq.out = ai({ confidence: 0.7 });
  const t1 = await ticket();
  cw.down = 'toggleStatus';
  const t = await runBot(t1);
  expect(t.status).toBe('in_progress');
  expect(t.chatwoot.pendingActions).toEqual(['handoff']);
  groq.out = ai();
  const t3 = await ticket();
  cw.down = 'createMessage';
  const t2 = await runBot(t3);
  expect(t2.ai.tier).toBe('human');                // auto downgraded when the reply could not be posted
  expect(t2.status).toBe('in_progress');
  expect(t2.chatwoot.pendingActions).toEqual(['handoff']);
});

test('ignored bot events: not pending / outgoing / private', async () => {
  const t = await ticket();
  groq.out = ai();
  await botHook(t, { conversation: { id: t.chatwoot.conversationId, status: 'open' } });
  await botHook(t, { message_type: 'outgoing' });
  await botHook(t, { private: true });
  await new Promise((r) => setTimeout(r, 80));
  expect(groq.calls).toBe(0);
});
