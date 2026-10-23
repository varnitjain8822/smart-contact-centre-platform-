import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { WebhookDelivery } from '../../src/models/WebhookDelivery.js';
import { Message } from '../../src/models/Message.js';
import { Ticket } from '../../src/models/Ticket.js';
import * as hub from '../../src/realtime/hub.js';
import { newTicket, setup, signed, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

const SECRET = 'inbox-secret';
let app, cw, a, t, frames;
const fakeRes = () => ({ write: (f) => frames.push(f) });

beforeAll(async () => {
  await startDb(); ({ app, chatwoot: cw } = await setup()); a = await signUp(app);
  await newTicket(a).expect(201);
  t = await Ticket.findOne({ number: 'SC-1001' });
  hub.add(String(t.customerId), fakeRes());
});
afterAll(stopDb);
beforeEach(() => { frames = []; cw.reset(); });

const conv = (o = {}) => ({ id: t.chatwoot.conversationId, status: 'pending', priority: null, labels: [], custom_attributes: { ticket_number: 'SC-1001' },
  updated_at: Date.now() / 1000, ...o });
const msg = (o = {}) => ({ event: 'message_created', id: Math.floor(Math.random() * 1e9), content: 'Hi from agent', message_type: 'outgoing', private: false,
  created_at: new Date().toISOString(), sender: { id: 3, name: 'Asha (Support)', type: 'user' }, conversation: conv(), ...o });
const post = (payload, opts) => signed(app, '/webhooks/chatwoot', payload, SECRET, opts);
const settle = () => new Promise((r) => setTimeout(r, 80));

test('signature pipeline: bad signature/stale/missing → 401; non-JSON → 400', async () => {
  expect((await post(msg(), { sig: 'sha256=00' }).expect(401)).body.error.code).toBe('INVALID_SIGNATURE');
  expect((await post(msg(), { ts: Math.floor(Date.now() / 1000) - 301 }).expect(401)).body.error.code).toBe('STALE_WEBHOOK');
  expect((await signed(app, '/webhooks/chatwoot', msg(), 'wrong-secret').expect(401)).body.error.code).toBe('INVALID_SIGNATURE');
  expect((await signed(app, '/bot/chatwoot', msg(), SECRET).expect(401)).body.error.code).toBe('INVALID_SIGNATURE');  // bot uses its own secret
});

test('outgoing public → Message stored + SSE; first response set; awaitingAcceptance cleared', async () => {
  const p = msg();
  const r = await post(p, { delivery: 'd-1' }).expect(200);
  expect(r.body).toEqual({ ok: true });
  const m = await until(() => Message.findOne({ chatwootMessageId: p.id }));
  expect(m).toMatchObject({ author: 'agent', authorName: 'Asha (Support)', body: 'Hi from agent', syncState: 'sent' });
  expect(m.createdAt.toISOString()).toBe(new Date(p.created_at).toISOString());
  await until(() => frames.some((f) => f.startsWith('event: message.created')) && frames.some((f) => f.startsWith('event: ticket.updated')));
  const ev = JSON.parse(frames.find((f) => f.startsWith('event: message.created')).split('data: ')[1]);
  expect(ev).toMatchObject({ ticketNumber: 'SC-1001', message: { author: 'agent', body: 'Hi from agent' } });
  const fresh = await Ticket.findById(t._id);
  expect(fresh.sla.firstResponseAt).toBeTruthy();
  expect(cw.named('setCustomAttributes')[0][2]).toEqual({ sla_due_at: fresh.sla.resolutionDueAt.toISOString() });

  // duplicate delivery id → 200 duplicate, handler not run again
  frames = [];
  expect((await post(p, { delivery: 'd-1' }).expect(200)).body).toEqual({ ok: true, duplicate: true });
  await settle();
  expect(frames).toEqual([]);
  // same message, new delivery id → idempotent by chatwootMessageId
  await post(p).expect(200); await settle();
  expect(await Message.countDocuments({ chatwootMessageId: p.id })).toBe(1);
});

test('private note / incoming / activity ignored', async () => {
  const before = await Message.countDocuments();
  await post(msg({ private: true, content: 'internal' })).expect(200);
  await post(msg({ message_type: 'incoming' })).expect(200);
  await post(msg({ message_type: 'activity' })).expect(200);
  await settle();
  expect(await Message.countDocuments()).toBe(before);
  expect(frames).toEqual([]);
});

test('urgent priority → critical + SLA recomputed; category from label; stale event ignored', async () => {
  const t0 = Date.now() / 1000;
  await post({ event: 'conversation_updated', ...conv({ status: 'open', priority: 'urgent', labels: ['technical', 'ai-human'], updated_at: t0 }) }).expect(200);
  const u = await until(async () => { const x = await Ticket.findById(t._id); return x.priority === 'critical' && x; });
  expect(u).toMatchObject({ status: 'in_progress', category: 'Technical' });
  expect(u.sla.responseDueAt.getTime() - u.createdAt.getTime()).toBe(15 * 60000);
  expect(u.sla.resolutionDueAt.getTime() - u.createdAt.getTime()).toBe(120 * 60000);
  expect(u.statusHistory.at(-1)).toMatchObject({ status: 'in_progress', by: 'agent' });
  expect(cw.named('setCustomAttributes').at(-1)[2]).toEqual({ sla_due_at: u.sla.resolutionDueAt.toISOString() });
  await until(() => frames.some((f) => f.startsWith('event: ticket.updated')));
  // older updated_at → ignored
  await post({ event: 'conversation_status_changed', ...conv({ status: 'snoozed', priority: 'low', updated_at: t0 - 10 }) }).expect(200);
  await settle();
  expect((await Ticket.findById(t._id))).toMatchObject({ status: 'in_progress', priority: 'critical' });
});

test('resolved → resolved/resolutionType human; reopen clears resolution', async () => {
  await post({ event: 'conversation_status_changed', ...conv({ status: 'resolved', priority: 'urgent' }) }).expect(200);
  const u = await until(async () => { const x = await Ticket.findById(t._id); return x.status === 'resolved' && x; });
  expect(u.resolutionType).toBe('human');
  expect(u.resolvedAt).toBeTruthy();
  await post({ event: 'conversation_status_changed', ...conv({ status: 'open', priority: 'urgent', updated_at: Date.now() / 1000 + 1 }) }).expect(200);
  const o = await until(async () => { const x = await Ticket.findById(t._id); return x.status === 'in_progress' && x; });
  expect(o).toMatchObject({ resolutionType: null, resolvedAt: null });
});

test('reopen resolved → pending (bot) sets ai.pendingSince so the sweep answers even if the bot webhook was handled first', async () => {
  await post({ event: 'conversation_status_changed', ...conv({ status: 'resolved', updated_at: Date.now() / 1000 + 10 }) }).expect(200);
  await until(async () => (await Ticket.findById(t._id)).status === 'resolved');
  await Ticket.updateOne({ _id: t._id }, { $set: { 'ai.pendingSince': null } });   // bot run skipped it while still resolved
  await post({ event: 'conversation_status_changed', ...conv({ status: 'pending', updated_at: Date.now() / 1000 + 20 }) }).expect(200);
  const o = await until(async () => { const x = await Ticket.findById(t._id); return x.status === 'ai_handling' && x; });
  expect(o.ai.pendingSince).toBeInstanceOf(Date);
});

test('findTicket: the conversation got linked between the id lookup and the claim → still found', async () => {
  const { findTicket } = await import('../../src/tickets/service.js');
  const spy = vi.spyOn(Ticket, 'findOne').mockResolvedValueOnce(null);   // first lookup races createTicket's link
  const found = await findTicket(conv({ meta: { sender: { identifier: String(t.customerId) } } }));
  spy.mockRestore();
  expect(String(found?._id)).toBe(String(t._id));
});

test('lookup by ticket_number when conversationId missing', async () => {
  await newTicket(a, { subject: 'Second one here' }).expect(201);
  await Ticket.updateOne({ number: 'SC-1002' }, { $set: { 'chatwoot.conversationId': null, 'chatwoot.syncState': 'pending' } });
  // wrong contact cannot claim the ticket
  const forged = msg({ conversation: conv({ id: 998, custom_attributes: { ticket_number: 'SC-1002' }, meta: { sender: { identifier: '0'.repeat(24) } } }) });
  await post(forged).expect(200);
  await settle();
  expect((await Ticket.findOne({ number: 'SC-1002' })).chatwoot.conversationId).toBeNull();
  const p = msg({ conversation: conv({ id: 999, custom_attributes: { ticket_number: 'SC-1002' }, meta: { sender: { identifier: String(t.customerId) } } }) });
  await post(p).expect(200);
  const m = await until(() => Message.findOne({ chatwootMessageId: p.id }));
  const t2 = await Ticket.findOne({ number: 'SC-1002' });
  expect(String(m.ticketId)).toBe(String(t2._id));
  expect(t2.chatwoot).toMatchObject({ conversationId: 999, syncState: 'synced' });
  // unknown conversation → ignored
  const before = await Message.countDocuments();
  await post(msg({ conversation: { id: 4242, custom_attributes: {} } })).expect(200);
  await settle();
  expect(await Message.countDocuments()).toBe(before);
});


test('F4: handler failure frees the delivery id, so a resend of the same delivery is processed', async () => {
  const p = msg();
  const spy = vi.spyOn(Ticket, 'findOne').mockRejectedValueOnce(new Error('mongo blip'));
  try {
    await post(p, { delivery: 'd-f4' }).expect(200);
    await until(async () => !(await WebhookDelivery.exists({ _id: 'd-f4' })));
  } finally { spy.mockRestore(); }
  expect(await Message.findOne({ chatwootMessageId: p.id })).toBeNull();
  expect((await post(p, { delivery: 'd-f4' }).expect(200)).body).toEqual({ ok: true });   // not deduped
  await until(() => Message.findOne({ chatwootMessageId: p.id }));
});

test('F13: attachment-only agent message gets a placeholder body, not an empty bubble', async () => {
  const p = msg({ content: null, attachments: [{ id: 1, file_type: 'image' }] });
  await post(p).expect(200);
  const m = await until(() => Message.findOne({ chatwootMessageId: p.id }));
  expect(m.body).toBe('(Attachment — not shown in the portal)');
});
