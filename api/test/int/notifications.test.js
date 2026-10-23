import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import * as bot from '../../src/ai/bot.js';
import { Notification } from '../../src/models/Notification.js';
import { Ticket } from '../../src/models/Ticket.js';
import { User } from '../../src/models/User.js';
import { unsubscribeToken, verifyUnsubscribeToken } from '../../src/notifications/service.js';
import * as hub from '../../src/realtime/hub.js';
import { sweepSla } from '../../src/sync/worker.js';
import { newTicket, setup, signed, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, cw, groq, mailer, a, me, frames;
beforeAll(async () => {
  await startDb(); ({ app, chatwoot: cw, groq, mailer } = await setup());
  a = await signUp(app);
  me = (await a.get('/api/auth/me').expect(200)).body.user;
  hub.add(me.id, { write: (f) => frames.push(f) });
});
afterAll(stopDb);
beforeEach(async () => { frames = []; mailer.sent.length = 0; mailer.fail = null; cw.reset(); await Notification.deleteMany({}); });

const ticket = async (agent = a) => Ticket.findOne({ number: (await newTicket(agent).expect(201)).body.ticket.number });
let msgId = 9000;
const agentReply = (t, content = 'Hi, I checked your payment.') => signed(app, '/webhooks/chatwoot', { event: 'message_created', id: ++msgId, content,
  message_type: 'outgoing', private: false, created_at: new Date().toISOString(), sender: { name: 'Asha', type: 'user' },
  conversation: { id: t.chatwoot.conversationId } }, 'inbox-secret').expect(200);
const convUpdate = (t, status) => signed(app, '/webhooks/chatwoot', { event: 'conversation_status_changed', id: t.chatwoot.conversationId, status,
  labels: [], custom_attributes: { ticket_number: t.number }, updated_at: Date.now() / 1000 }, 'inbox-secret').expect(200);
const notes = (type) => until(async () => { const n = await Notification.find({ type }).sort({ createdAt: 1 }); return n.length && n; });
const frame = (name) => frames.filter((f) => f.startsWith(`event: ${name}\n`)).map((f) => JSON.parse(f.split('data: ')[1]));

test('agent public reply → in-app notification + SSE notification.created + email (with ticket link and signed unsubscribe)', async () => {
  const t = await ticket();
  await agentReply(t);
  const [n] = await notes('agent_reply');
  expect(n).toMatchObject({ ticketNumber: t.number, title: `New reply on ${t.number}`, body: 'Hi, I checked your payment.', readAt: null });
  const ev = await until(() => frame('notification.created')[0]);   // emitted right after the unread count query
  expect(ev).toEqual({ notification: { id: String(n._id), type: 'agent_reply', ticketNumber: t.number, title: n.title, body: n.body, readAt: null,
    createdAt: n.createdAt.toISOString() }, unreadCount: 1 });
  const mail = await until(() => mailer.sent[0]);
  expect(mail.to).toBe(me.email);
  expect(mail.subject).toBe(`SmartCC: New reply on ${t.number}`);
  expect(mail.text).toContain(`Hi Priya Shah,`);
  expect(mail.text).toContain(`http://localhost:5173/tickets/${t.number}`);
  const unsub = mail.text.match(/Unsubscribe: (\S+)/)[1];
  expect(unsub).toBe(`http://localhost:5173/api/notifications/unsubscribe?token=${unsubscribeToken(me.id)}`);
  expect(mail.headers['List-Unsubscribe']).toBe(`<${unsub}>`);
});

test('email throttle: ≤1 email per ticket per 5 min; in-app always', async () => {
  const t = await ticket();
  await agentReply(t, 'one'); await until(() => mailer.sent.length === 1);
  await agentReply(t, 'two');
  await until(async () => (await Notification.countDocuments({ type: 'agent_reply' })) === 2);
  await new Promise((r) => setTimeout(r, 80));
  expect(mailer.sent).toHaveLength(1);
  await Ticket.updateOne({ _id: t._id }, { $set: { notifyEmailAt: new Date(Date.now() - 5 * 60_000 - 1000) } });
  await agentReply(t, 'three');
  await until(() => mailer.sent.length === 2);
  // a different ticket is not throttled by the first
  await agentReply(await ticket(), 'other');
  await until(() => mailer.sent.length === 3);
});

test('status → waiting_on_customer / resolved notify; in_progress and customer-initiated resolve do not', async () => {
  const t = await ticket();
  await convUpdate(t, 'open');
  await new Promise((r) => setTimeout(r, 80));
  expect(await Notification.countDocuments()).toBe(0);
  await convUpdate(t, 'snoozed');
  expect((await notes('status'))[0]).toMatchObject({ title: `${t.number} is waiting on you`, body: 'The agent needs more information from you.' });
  await convUpdate(t, 'resolved');
  await until(async () => (await Notification.countDocuments({ type: 'status' })) === 2);
  expect((await Notification.findOne({ type: 'status' }).sort({ createdAt: -1 })).title).toBe(`${t.number} was resolved`);
  const t2 = await ticket();
  await a.post(`/api/tickets/${t2.number}/resolve`).send({}).expect(200);
  await new Promise((r) => setTimeout(r, 50));
  expect(await Notification.countDocuments({ ticketNumber: t2.number })).toBe(0);
});

test('SLA breach and AI answer awaiting acceptance notify', async () => {
  const t = await ticket();
  await Ticket.updateOne({ _id: t._id }, { $set: { 'sla.responseDueAt': new Date(Date.now() - 1000) } });
  await sweepSla();
  expect((await notes('sla_breach'))[0]).toMatchObject({ ticketNumber: t.number, title: `${t.number} is taking longer than promised` });

  const t2 = await ticket();
  groq.out = { intent: 'x', category: 'Billing', priority: 'medium', confidence: 0.95, triggers: [], answer: 'Wait 30 minutes.',
    sources: ['payment-pending-subscription-not-active'], summary: '' };
  await Ticket.updateOne({ _id: t2._id }, { $set: { 'ai.pendingSince': new Date() } });
  expect((await bot.run(t2._id)).tier).toBe('auto');
  expect((await notes('ai_answer'))[0]).toMatchObject({ ticketNumber: t2.number, title: `The AI assistant answered ${t2.number}` });
});

test('preferences: email.reply=false → no reply email (status email still sent); inApp=false → no in-app', async () => {
  const p = (await a.patch('/api/me').send({ notify: { email: { reply: false } } }).expect(200)).body.user;
  expect(p.notify).toEqual({ email: { reply: false, status: true, sla: true }, inApp: true });
  const t = await ticket();
  await agentReply(t);
  await notes('agent_reply');
  await new Promise((r) => setTimeout(r, 80));
  expect(mailer.sent).toHaveLength(0);
  await convUpdate(t, 'snoozed');
  await until(() => mailer.sent.length === 1);
  await a.patch('/api/me').send({ notify: { inApp: false, email: { reply: true } } }).expect(200);
  await Ticket.updateOne({ _id: t._id }, { $set: { notifyEmailAt: null } });
  await agentReply(t, 'quiet');
  await until(() => mailer.sent.length === 2);
  expect(await Notification.countDocuments({ body: 'quiet' })).toBe(0);
  await a.patch('/api/me').send({ notify: { inApp: true } }).expect(200);
  await a.patch('/api/me').send({ notify: { sms: true } }).expect(400);
  await a.patch('/api/me').send({}).expect(400);
});

test('GET /api/notifications pages newest first with unreadCount; POST read by ids / all; per-user', async () => {
  const uid = me.id;
  const base = Date.now();
  await Notification.insertMany(Array.from({ length: 5 }, (_, i) => ({ userId: uid, type: 'status', ticketNumber: 'SC-1', title: `n${i}`, createdAt: new Date(base + i) })));
  const b = await signUp(app, 'Other User');
  const bid = (await b.get('/api/auth/me')).body.user.id;
  await Notification.create({ userId: bid, type: 'status', ticketNumber: 'SC-2', title: 'theirs' });
  await request(app).get('/api/notifications').expect(401);
  const p1 = (await a.get('/api/notifications?limit=2').expect(200)).body;
  expect(p1.items.map((x) => x.title)).toEqual(['n4', 'n3']);
  expect(p1.unreadCount).toBe(5);
  const p2 = (await a.get(`/api/notifications?limit=2&before=${p1.nextCursor}`).expect(200)).body;
  expect(p2.items.map((x) => x.title)).toEqual(['n2', 'n1']);
  const r1 = (await a.post('/api/notifications/read').send({ ids: [p1.items[0].id] }).expect(200)).body;
  expect(r1).toEqual({ unreadCount: 4 });
  expect((await a.get('/api/notifications?unread=true').expect(200)).body.items).toHaveLength(4);
  expect((await a.get('/api/notifications?limit=1').expect(200)).body.items[0].readAt).toEqual(expect.any(String));
  const theirs = (await b.get('/api/notifications').expect(200)).body.items[0].id;
  await a.post('/api/notifications/read').send({ ids: [theirs] }).expect(200);   // silently ignored
  expect((await b.get('/api/notifications').expect(200)).body.unreadCount).toBe(1);
  expect((await a.post('/api/notifications/read').send({ all: true }).expect(200)).body).toEqual({ unreadCount: 0 });
  await a.post('/api/notifications/read').send({}).expect(400);
  await a.post('/api/notifications/read').send({ ids: ['nope'] }).expect(400);
  await a.get('/api/notifications?before=garbage').expect(400);
});

test('unsubscribe: signed token turns all emails off (no auth needed); tampered token → 400', async () => {
  const tok = unsubscribeToken(me.id);
  expect(verifyUnsubscribeToken(tok)).toBe(me.id);
  expect(verifyUnsubscribeToken(`${me.id}.AAAA`)).toBeNull();
  const bad = await request(app).get(`/api/notifications/unsubscribe?token=${me.id}.forged`).expect(400);
  expect(bad.text).toContain('not valid');
  const ok = await request(app).get(`/api/notifications/unsubscribe?token=${tok}`).expect(200);
  expect(ok.headers['content-type']).toMatch(/text\/html/);
  expect(ok.text).toContain('You are unsubscribed');
  expect((await User.findById(me.id)).notify.email.toObject()).toEqual({ reply: false, status: false, sla: false });
  const t = await ticket();
  await agentReply(t);
  await notes('agent_reply');
  await new Promise((r) => setTimeout(r, 80));
  expect(mailer.sent).toHaveLength(0);
  await a.patch('/api/me').send({ notify: { email: { reply: true, status: true, sla: true } } }).expect(200);
});

test('Hindi user: Hindi in-app copy and Hindi email; mailer failure never breaks the webhook', async () => {
  const h = await signUp(app, 'Anita Verma');
  await h.patch('/api/me').send({ locale: 'hi' }).expect(200);
  const t = await ticket(h);
  await convUpdate(t, 'resolved');
  const [n] = await notes('status');
  expect(n.title).toBe(`${t.number} हल हो गया है`);
  const mail = await until(() => mailer.sent[0]);
  expect(mail.text).toContain('नमस्ते Anita Verma');
  expect(mail.text).toContain('सदस्यता छोड़ें:');
  mailer.fail = new Error('smtp down');
  const t2 = await ticket(h);
  await agentReply(t2, 'जवाब');
  expect((await notes('agent_reply'))[0].title).toBe(`${t2.number} पर नया जवाब`);
  await until(() => mailer.send.mock.calls.length >= 2);
});
