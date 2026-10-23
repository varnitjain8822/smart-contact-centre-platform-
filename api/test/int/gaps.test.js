import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { AssistantFeedback, KbVote } from '../../src/models/Feedback.js';
import { Ticket } from '../../src/models/Ticket.js';
import { User } from '../../src/models/User.js';
import * as hub from '../../src/realtime/hub.js';
import { newTicket, setup, signed, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, cw;
beforeAll(async () => { await startDb(); ({ app, chatwoot: cw } = await setup()); });
afterAll(stopDb);
beforeEach(() => cw.reset());

const cookieOf = (r) => r.headers['set-cookie']?.find((c) => c.startsWith('scc_session='));
const settle = () => new Promise((r) => setTimeout(r, 80));

test('typing webhook → SSE typing to the owner; private notes and contacts ignored; signature still enforced', async () => {
  const a = await signUp(app);
  await newTicket(a).expect(201);
  const me = (await a.get('/api/auth/me')).body.user;
  const t = await Ticket.findOne({ customerId: me.id });
  const frames = [];
  hub.add(me.id, { write: (f) => frames.push(f) });
  const ev = (event, o = {}) => ({ event, user: { id: 3, name: 'Asha', email: 'a@x', type: 'user' },
    conversation: { id: t.chatwoot.conversationId, custom_attributes: { ticket_number: t.number } }, is_private: false, ...o });
  const post = (p, secret = 'inbox-secret') => signed(app, '/webhooks/chatwoot', p, secret);

  await post(ev('conversation_typing_on'), 'wrong').expect(401);
  await post(ev('conversation_typing_on', { is_private: true })).expect(200);
  await post(ev('conversation_typing_on', { user: { id: 9, name: 'Cust', type: 'contact' } })).expect(200);
  await settle();
  expect(frames).toEqual([]);

  await post(ev('conversation_typing_on')).expect(200);
  await until(() => frames.length === 1);
  expect(frames[0]).toBe(`event: typing\ndata: ${JSON.stringify({ ticketNumber: t.number, on: true, name: 'Asha' })}\n\n`);
  await post(ev('conversation_typing_off')).expect(200);
  await until(() => frames.length === 2);
  expect(JSON.parse(frames[1].split('data: ')[1])).toEqual({ ticketNumber: t.number, on: false, name: 'Asha' });
});

test('KB feedback: auth required, one vote per user (upsert), counts + myVote on the article', async () => {
  await request(app).post('/api/kb/articles/refund-status/feedback').send({ helpful: true }).expect(401);
  const a = await signUp(app), b = await signUp(app);
  await a.post('/api/kb/articles/nope/feedback').send({ helpful: true }).expect(404);
  await a.post('/api/kb/articles/refund-status/feedback').send({ helpful: 'yes' }).expect(400);
  await a.post('/api/kb/articles/refund-status/feedback').send({ helpful: true }).expect(200);
  const r = await a.post('/api/kb/articles/refund-status/feedback').send({ helpful: false }).expect(200);
  expect(r.body.feedback).toEqual({ helpfulCount: 0, notHelpfulCount: 1, myVote: false });
  await b.post('/api/kb/articles/refund-status/feedback').send({ helpful: true }).expect(200);
  expect(await KbVote.countDocuments({ slug: 'refund-status' })).toBe(2);

  expect((await a.get('/api/kb/articles/refund-status').expect(200)).body.article).toMatchObject({ helpfulCount: 1, notHelpfulCount: 1, myVote: false });
  expect((await request(app).get('/api/kb/articles/refund-status').expect(200)).body.article).toMatchObject({ helpfulCount: 1, notHelpfulCount: 1, myVote: null });
});

test('assistant feedback: stored once per answer, updated, withdrawn with null', async () => {
  const a = await signUp(app);
  const body = { answer: 'Wait 30 minutes, then retry.', question: 'Plan inactive?', helpful: true, sources: [{ slug: 'refund-status', title: 'Refunds' }] };
  await request(app).post('/api/assistant/feedback').send(body).expect(401);
  await a.post('/api/assistant/feedback').send({ ...body, extra: 1 }).expect(400);
  await a.post('/api/assistant/feedback').send(body).expect(204);
  await a.post('/api/assistant/feedback').send({ ...body, helpful: false }).expect(204);
  const docs = await AssistantFeedback.find().lean();
  expect(docs).toHaveLength(1);
  expect(docs[0]).toMatchObject({ excerpt: body.answer, question: 'Plan inactive?', helpful: false, sources: body.sources, locale: 'en' });
  await a.post('/api/assistant/feedback').send({ ...body, helpful: null }).expect(204);
  expect(await AssistantFeedback.countDocuments()).toBe(0);
});

test('remember me: false → session cookie (no Max-Age); true/omitted → 7 days; kept on password change', async () => {
  const a = await signUp(app);
  const { email } = (await a.get('/api/auth/me')).body.user;
  const login = (remember) => request(app).post('/api/auth/login').set('X-Forwarded-For', '9.9.9.9').send({ email, password: 's3cure-pass', ...(remember !== undefined && { remember }) }).expect(200);
  const s = cookieOf(await login(false));
  expect(s).toMatch(/HttpOnly/); expect(s).not.toMatch(/Max-Age|Expires/);
  expect(cookieOf(await login(true))).toMatch(/Max-Age=604800/);
  expect(cookieOf(await login())).toMatch(/Max-Age=604800/);
  const r = await request(app).post('/api/me/password').set('Cookie', s.split(';')[0]).send({ currentPassword: 's3cure-pass', newPassword: 'n3w-pass-123' }).expect(204);
  expect(cookieOf(r)).not.toMatch(/Max-Age/);
});

test('profile phone/organisation: validated, normalised, cleared; synced to the Chatwoot contact best-effort', async () => {
  const a = await signUp(app);
  expect((await a.patch('/api/me').send({ phone: '98765 43210' }).expect(400)).body.error.details[0].path).toBe('phone');
  await a.patch('/api/me').send({ organization: 'x'.repeat(121) }).expect(400);
  // no Chatwoot contact yet → saved, nothing pushed
  let r = await a.patch('/api/me').send({ phone: '+91 98765-43210', organization: ' Acme Ltd ' }).expect(200);
  expect(r.body.user).toMatchObject({ phone: '+919876543210', organization: 'Acme Ltd' });
  expect(cw.named('updateContact')).toEqual([]);
  // first ticket creates the contact and pushes the profile
  await newTicket(a).expect(201);
  await until(() => cw.named('updateContact').length === 1);
  expect(cw.named('updateContact')[0].slice(1)).toEqual([1, { phone_number: '+919876543210', additional_attributes: { company_name: 'Acme Ltd' } }]);
  // Chatwoot down → PATCH still 200
  cw.down = 'updateContact';
  r = await a.patch('/api/me').send({ phone: '', organization: '' }).expect(200);
  expect(r.body.user).toMatchObject({ phone: null, organization: null });
  await until(() => cw.named('updateContact').length === 2);
  expect(cw.named('updateContact')[1][2]).toEqual({ phone_number: '', additional_attributes: { company_name: '' } });
  expect((await User.findOne({ email: (await a.get('/api/auth/me')).body.user.email }).lean()).phone).toBeUndefined();
});

test('logout-others: other sessions 401, this one re-issued and still valid, SSE streams ended', async () => {
  const a = await signUp(app);
  const { email, id } = (await a.get('/api/auth/me')).body.user;
  const other = request.agent(app);
  await other.post('/api/auth/login').set('X-Forwarded-For', '8.8.8.8').send({ email, password: 's3cure-pass', remember: false }).expect(200);
  let ended = 0;
  hub.add(id, { write() {}, end: () => { ended++; } });
  await request(app).post('/api/auth/logout-others').send({}).expect(401);
  const r = await other.post('/api/auth/logout-others').send({}).expect(204);
  expect(cookieOf(r)).not.toMatch(/Max-Age/);   // keeps this device's remember choice
  expect(ended).toBe(1);
  expect(hub.count(id)).toBe(0);
  await other.get('/api/auth/me').expect(200);
  await a.get('/api/auth/me').expect(401);
});
