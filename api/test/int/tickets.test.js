import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { cfg } from '../../src/config.js';
import { log } from '../../src/lib/log.js';
import { Message } from '../../src/models/Message.js';
import { Ticket } from '../../src/models/Ticket.js';
import * as svc from '../../src/tickets/service.js';
import { tick } from '../../src/sync/worker.js';
import { newTicket, setup, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, cw, a;
beforeAll(async () => { await startDb(); ({ app, chatwoot: cw } = await setup()); a = await signUp(app); });
afterAll(stopDb);
beforeEach(() => cw.reset());

test('create → 201 SC-1001, first message = description, conversation opener = subject+description', async () => {
  const r = await newTicket(a).set('Idempotency-Key', 'key-0001-abc').expect(201);
  const { ticket, messages } = r.body;
  expect(ticket).toMatchObject({ number: 'SC-1001', status: 'ai_handling', priority: 'medium', category: 'Billing', customerCategory: 'Billing',
    delivery: 'synced', aiTier: null, resolutionType: null, csat: null, actions: { canAccept: false, canRequestHuman: true, canResolve: true, canRate: false } });
  expect(ticket.statusHistory).toEqual([{ status: 'ai_handling', at: expect.any(String), by: 'customer' }]);
  expect(ticket.sla.state).toBe('on_track');
  expect(messages).toHaveLength(1);
  expect(messages[0]).toMatchObject({ ticketNumber: 'SC-1001', author: 'customer', authorName: 'Priya Shah',
    body: 'I paid 4999 yesterday via UPI and the plan is still inactive.', deliveryState: 'sent', clientMessageId: null, sources: [] });
  const [, conv] = cw.named('createConversation')[0];
  expect(conv).toMatchObject({ sourceId: 'src-1', contactId: 1, ticketNumber: 'SC-1001',
    content: 'Payment deducted but plan inactive\n\nI paid 4999 yesterday via UPI and the plan is still inactive.' });
  expect(new Date(conv.slaDueAt).toISOString()).toBe(ticket.sla.responseDueAt);
  // idempotent replay → 200 same ticket + same first message
  const again = await newTicket(a).set('Idempotency-Key', 'key-0001-abc').expect(200);
  expect(again.body.ticket.number).toBe('SC-1001');
  expect(again.body.messages[0].id).toBe(messages[0].id);
  expect(cw.named('createConversation')).toHaveLength(1);
  expect(cw.named('createContact')).toHaveLength(1);
});

test('validation 400 with field details; bad Idempotency-Key 400', async () => {
  const r = await newTicket(a, { subject: 'Hi', description: 'short' }).expect(400);
  expect(r.body.error).toMatchObject({ code: 'VALIDATION_FAILED', message: 'Subject must be at least 5 characters' });
  expect(r.body.error.details.map((d) => d.path)).toEqual(['subject', 'description']);
  await newTicket(a).set('Idempotency-Key', 'bad key!').expect(400);
});

test('Chatwoot down → delivery queued; worker tick after recovery → synced; contact reused', async () => {
  cw.down = true;
  const r = await newTicket(a, { category: null }).expect(201);
  expect(r.body.ticket).toMatchObject({ delivery: 'queued', category: 'General', customerCategory: null });
  const t = await Ticket.findOne({ number: r.body.ticket.number });
  expect(t.chatwoot.attempts).toBe(1);
  expect(t.chatwoot.nextAttemptAt.getTime() - Date.now()).toBeGreaterThan(25_000);
  cw.down = false;
  await Ticket.updateOne({ _id: t._id }, { $set: { 'chatwoot.nextAttemptAt': new Date() } });
  await tick();
  expect((await a.get(`/api/tickets/${t.number}`).expect(200)).body.ticket.delivery).toBe('synced');
  expect(cw.named('createContact')).toHaveLength(0);
});

test('backoff: 30 s for 20 attempts then 5 min; delayed after 20', async () => {
  const t = await Ticket.findOne({ number: 'SC-1001' });
  await Ticket.updateOne({ _id: t._id }, { $set: { 'chatwoot.attempts': 19 } });
  await svc.markRetry(await Ticket.findById(t._id), new Error('x'));
  let u = await Ticket.findById(t._id);
  expect(u.chatwoot.nextAttemptAt - Date.now()).toBeLessThan(31_000);
  await svc.markRetry(u, new Error('x'));
  u = await Ticket.findById(t._id);
  expect(u.chatwoot.nextAttemptAt - Date.now()).toBeGreaterThan(290_000);
  await Ticket.updateOne({ _id: t._id }, { $set: { 'chatwoot.syncState': 'pending' } });
  expect((await a.get('/api/tickets/SC-1001').expect(200)).body.ticket.delivery).toBe('delayed');
  await Ticket.updateOne({ _id: t._id }, { $set: { 'chatwoot.syncState': 'synced', 'chatwoot.attempts': 0 } });
});

test('list scope/cursor; foreign ticket → 404', async () => {
  await newTicket(a, { subject: 'Third ticket here' }).expect(201);
  const p1 = await a.get('/api/tickets?limit=2').expect(200);
  expect(p1.body.items).toHaveLength(2);
  expect(p1.body.nextCursor).toEqual(expect.any(String));
  const p2 = await a.get(`/api/tickets?limit=2&before=${encodeURIComponent(p1.body.nextCursor)}`).expect(200);
  expect(p2.body.items).toHaveLength(1);
  expect(p2.body.nextCursor).toBeNull();
  expect(new Set([...p1.body.items, ...p2.body.items].map((t) => t.number)).size).toBe(3);
  expect(Object.keys(p1.body.items[0]).sort()).toEqual(['aiTier', 'category', 'createdAt', 'delivery', 'lastMessageAt', 'number', 'priority', 'sla', 'status', 'subject', 'updatedAt']);
  expect((await a.get('/api/tickets?scope=resolved').expect(200)).body.items).toHaveLength(0);
  expect((await a.get('/api/tickets?scope=all').expect(200)).body.items).toHaveLength(3);
  const other = await signUp(app, 'Other Person');
  expect((await other.get('/api/tickets/SC-1001').expect(404)).body.error.code).toBe('NOT_FOUND');
  await other.get('/api/tickets/SC-1001/messages').expect(404);
  await other.post('/api/tickets/SC-1001/resolve').send({}).expect(404);
  expect((await other.get('/api/tickets').expect(200)).body.items).toHaveLength(0);
});

test('send message idempotent by clientMessageId; pending when Chatwoot fails; worker delivers', async () => {
  const cid = randomUUID();
  const r = await a.post('/api/tickets/SC-1001/messages').send({ body: 'Still not active', clientMessageId: cid }).expect(201);
  expect(r.body.message).toMatchObject({ author: 'customer', body: 'Still not active', clientMessageId: cid, deliveryState: 'sent' });
  expect(cw.named('createMessage')[0]).toEqual(['createMessage', expect.any(Number), { content: 'Still not active', messageType: 'incoming', sourceId: `smartcc-${r.body.message.id}` }, 'admin']);
  const again = await a.post('/api/tickets/SC-1001/messages').send({ body: 'Still not active', clientMessageId: cid }).expect(200);
  expect(again.body.message.id).toBe(r.body.message.id);
  expect(await Message.countDocuments({ clientMessageId: cid })).toBe(1);
  expect((await Ticket.findOne({ number: 'SC-1001' })).ai.pendingSince).toBeTruthy();

  cw.down = true;
  const p = await a.post('/api/tickets/SC-1001/messages').send({ body: 'Hello?', clientMessageId: randomUUID() }).expect(201);
  expect(p.body.message.deliveryState).toBe('pending');
  cw.down = false;
  await Message.updateOne({ _id: p.body.message.id }, { $set: { nextAttemptAt: new Date() } });
  await tick();
  expect((await Message.findById(p.body.message.id)).syncState).toBe('sent');
  await a.post('/api/tickets/SC-1001/messages').send({ body: 'x', clientMessageId: 'not-a-uuid' }).expect(400);
});

test('E10 messages oldest-first; background reconcile at most once per 30 s', async () => {
  cw.conversation = { id: 1, status: 'pending', priority: null, labels: [], updated_at: Date.now() / 1000, custom_attributes: {} };
  cw.messages = [];
  const r = await a.get('/api/tickets/SC-1001/messages').expect(200);
  const times = r.body.items.map((m) => m.createdAt);
  expect([...times].sort()).toEqual(times);
  await until(() => cw.named('listMessages').length === 1);
  await a.get('/api/tickets/SC-1001/messages').expect(200);
  await new Promise((res) => setTimeout(res, 50));
  expect(cw.named('getConversation')).toHaveLength(1);
});

test('accept only when canAccept else 409; resolves with admin token', async () => {
  const r = await a.post('/api/tickets/SC-1001/accept').send({}).expect(409);
  expect(r.body.error).toMatchObject({ code: 'INVALID_STATE', details: { status: 'ai_handling' } });
  await Ticket.updateOne({ number: 'SC-1001' }, { $set: { 'ai.awaitingAcceptance': true, 'ai.tier': 'auto' } });
  const ok = await a.post('/api/tickets/SC-1001/accept').send({}).expect(200);
  expect(ok.body.ticket).toMatchObject({ status: 'resolved', resolutionType: 'ai', actions: { canAccept: false, canRate: true } });
  expect(ok.body.ticket.statusHistory.at(-1)).toMatchObject({ status: 'resolved', by: 'customer' });
  expect(cw.named('toggleStatus')[0]).toEqual(['toggleStatus', expect.any(Number), 'resolved', 'admin']);
  await a.post('/api/tickets/SC-1001/accept').send({}).expect(409);
  await a.post('/api/tickets/SC-1001/resolve').send({}).expect(409);
});

test('csat: twice → 409 ALREADY_RATED; before resolve → 409 INVALID_STATE; Chatwoot calls with admin token', async () => {
  const r = await a.post('/api/tickets/SC-1001/csat').send({ rating: 4, comment: 'Quick fix' }).expect(200);
  expect(r.body.ticket.csat).toMatchObject({ rating: 4, comment: 'Quick fix' });
  expect(r.body.ticket.actions.canRate).toBe(false);
  expect(cw.named('setCustomAttributes')[0]).toEqual(['setCustomAttributes', expect.any(Number), { csat: 4 }, 'admin']);
  expect(cw.named('createMessage')[0]).toEqual(['createMessage', expect.any(Number), { content: 'CSAT 4/5 — Quick fix', isPrivate: true }, 'admin']);
  expect((await a.post('/api/tickets/SC-1001/csat').send({ rating: 5 }).expect(409)).body.error.code).toBe('ALREADY_RATED');
  expect((await a.post('/api/tickets/SC-1002/csat').send({ rating: 5 }).expect(409)).body.error.code).toBe('INVALID_STATE');
  await a.post('/api/tickets/SC-1001/csat').send({ rating: 6 }).expect(400);
});

test('handoff posts private note then toggle open with BOT token; 409 second time', async () => {
  const r = await a.post('/api/tickets/SC-1002/handoff').send({}).expect(200);
  expect(r.body.ticket).toMatchObject({ status: 'in_progress', actions: { canRequestHuman: false } });
  const [note, toggle] = cw.calls.filter((c) => ['createMessage', 'toggleStatus'].includes(c[0]));
  expect(note).toEqual(['createMessage', expect.any(Number), { content: 'Customer requested a human agent.', isPrivate: true }, 'bot']);
  expect(toggle).toEqual(['toggleStatus', expect.any(Number), 'open', 'bot']);
  const msgs = (await a.get('/api/tickets/SC-1002/messages').expect(200)).body.items;
  expect(msgs.at(-1)).toMatchObject({ author: 'system', authorName: 'SmartCC', body: 'You asked for a person. An agent will reply here.' });
  await a.post('/api/tickets/SC-1002/handoff').send({}).expect(409);
});

test('resolve: Chatwoot failure adds pendingActions and still 200; worker replays and pulls', async () => {
  cw.down = true;
  const r = await a.post('/api/tickets/SC-1003/resolve').send({}).expect(200);
  expect(r.body.ticket).toMatchObject({ status: 'resolved', resolutionType: 'human' });
  expect((await Ticket.findOne({ number: 'SC-1003' })).chatwoot.pendingActions).toEqual(['resolve']);
  cw.down = false;
  await tick();
  expect((await Ticket.findOne({ number: 'SC-1003' })).chatwoot.pendingActions).toEqual([]);
  expect(cw.named('toggleStatus').at(-1)).toEqual(['toggleStatus', expect.any(Number), 'resolved', 'admin']);
});

test('unauthenticated → 401', async () => {
  const { default: request } = await import('supertest');
  expect((await request(app).get('/api/tickets').expect(401)).body.error.code).toBe('UNAUTHENTICATED');
});

test('inline Chatwoot attempt in flight → worker tick does not send the same ticket/message again', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const orig = cw.createMessage.getMockImplementation();
  cw.createMessage.mockImplementationOnce(async (...args) => { await gate; return orig(...args); });
  const sending = a.post('/api/tickets/SC-1001/messages').send({ body: 'Racing the worker', clientMessageId: randomUUID() }).then((r) => r);
  const before = cw.createMessage.mock.calls.length;
  await until(() => cw.createMessage.mock.calls.length === before + 1);
  await tick();                                   // worker runs while the inline send is still waiting on Chatwoot
  release();
  expect((await sending).status).toBe(201);
  expect(cw.createMessage.mock.calls.length).toBe(before + 1);
  const created = await newTicket(a, { subject: 'Fresh ticket racing' }).expect(201);
  await tick();
  expect(cw.named('createConversation').filter((c) => c[1].ticketNumber === created.body.ticket.number)).toHaveLength(1);
});

test('F7: Chatwoot hangs → create still answers 201 within the inline budget, row left queued; slow attempt finishes in background', async () => {
  const prev = cfg.CHATWOOT_INLINE_MS; cfg.CHATWOOT_INLINE_MS = 100;
  let release;
  const gate = new Promise((r) => { release = r; });
  const orig = cw.createConversation.getMockImplementation();
  cw.createConversation.mockImplementationOnce(async (...args) => { await gate; return orig(...args); });
  try {
    const t0 = Date.now();
    const r = await newTicket(a, { subject: 'Chatwoot is hanging' }).expect(201);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(r.body.ticket.delivery).not.toBe('synced');
    release();
    await until(async () => (await Ticket.findOne({ number: r.body.ticket.number })).chatwoot.syncState === 'synced');
    await tick();
    expect(cw.named('createConversation').filter((c) => c[1].ticketNumber === r.body.ticket.number)).toHaveLength(1);
  } finally { cfg.CHATWOOT_INLINE_MS = prev; }
});

test('F7: retry after a failed attempt reuses the conversation Chatwoot already created (no duplicate)', async () => {
  cw.down = 'createConversation';
  const r = await newTicket(a, { subject: 'Timed out but created' }).expect(201);
  cw.down = false;
  const t = await Ticket.findOne({ number: r.body.ticket.number });
  expect(t.chatwoot.attempts).toBe(1);
  await Ticket.updateOne({ _id: t._id }, { $set: { 'chatwoot.nextAttemptAt': new Date(0) } });
  cw.existingConversation = { id: 777, custom_attributes: { ticket_number: t.number } };
  try { await tick(); } finally { cw.existingConversation = null; }
  expect(cw.named('findConversationByTicket')).toEqual([['findConversationByTicket', 1, t.number]]);
  expect(cw.named('createConversation')).toHaveLength(1);       // only the failed inline one
  expect((await Ticket.findById(t._id)).chatwoot).toMatchObject({ conversationId: 777, syncState: 'synced' });
});

test('F7: message retry finds the send Chatwoot already stored (source_id) instead of posting again', async () => {
  cw.down = 'createMessage';
  const r = await a.post('/api/tickets/SC-1001/messages').send({ body: 'Did this arrive?', clientMessageId: randomUUID() }).expect(201);
  cw.down = false;
  const m = await Message.findById(r.body.message.id);
  expect(m.attempts).toBe(1);
  expect(cw.named('createMessage')[0][2].sourceId).toBe(`smartcc-${m._id}`);
  await Message.updateOne({ _id: m._id }, { $set: { nextAttemptAt: new Date(0) } });
  cw.messages = [{ id: 5555, source_id: `smartcc-${m._id}`, message_type: 0 }];
  try { await tick(); } finally { cw.messages = []; }
  expect(cw.named('createMessage')).toHaveLength(1);
  expect(await Message.findById(m._id)).toMatchObject({ syncState: 'sent', chatwootMessageId: 5555 });
});

test('F10: tickets sharing updatedAt across a page boundary are not skipped', async () => {
  const b = await signUp(app, 'Same Time');
  for (const s of ['Tie one here', 'Tie two here', 'Tie three here']) await newTicket(b, { subject: s }).expect(201);
  const me = (await b.get('/api/auth/me').expect(200)).body.user.id;
  await Ticket.collection.updateMany({ customerId: new (await import('mongoose')).default.Types.ObjectId(me) }, { $set: { updatedAt: new Date('2026-10-01T00:00:00Z') } });
  const seen = [];
  let cursor = null;
  do {
    const p = await b.get(`/api/tickets?limit=1${cursor ? `&before=${encodeURIComponent(cursor)}` : ''}`).expect(200);
    seen.push(...p.body.items.map((x) => x.number)); cursor = p.body.nextCursor;
  } while (cursor);
  expect(new Set(seen).size).toBe(3);
  expect(seen).toHaveLength(3);
  expect((await b.get('/api/tickets?before=garbage').expect(400)).body.error.code).toBe('VALIDATION_FAILED');
});

test('F9: a failing reconcile claim after the response is logged, not thrown at the sent response', async () => {
  await Ticket.updateOne({ number: 'SC-1001' }, { $set: { 'chatwoot.reconciledAt': null } });
  const warn = vi.spyOn(log, 'warn');
  const upd = vi.spyOn(Ticket, 'updateOne').mockRejectedValueOnce(new Error('mongo blip'));
  try {
    await a.get('/api/tickets/SC-1001/messages').expect(200);
    await until(() => warn.mock.calls.some(([o]) => o.evt === 'reconcile_claim_failed'));
  } finally { upd.mockRestore(); warn.mockRestore(); }
});
