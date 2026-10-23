import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { pending } from '../../src/ai/queue.js';
import { plainText } from '../../src/chatwoot/whatsapp.js';
import { Message } from '../../src/models/Message.js';
import { Ticket } from '../../src/models/Ticket.js';
import { User } from '../../src/models/User.js';
import { setup, signed, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, cw, groq, mailer;
beforeAll(async () => { await startDb(); ({ app, chatwoot: cw, groq, mailer } = await setup()); });
afterAll(stopDb);
beforeEach(() => { cw.reset(); groq.out = null; groq.fail = null; });

const SLUG = 'payment-pending-subscription-not-active';
let conv = 9000, msg = 50_000;
const conversation = (id, o = {}) => ({ id, channel: 'Channel::Whatsapp', inbox_id: 3, status: 'pending', labels: [], custom_attributes: {}, ...o });
const incoming = (convId, phone, content, o = {}) => signed(app, '/bot/chatwoot', { event: 'message_created', id: ++msg, message_type: 'incoming',
  private: false, content, created_at: new Date().toISOString(), sender: { name: 'Ravi Kumar', phone_number: phone, type: 'contact' },
  conversation: conversation(convId), inbox: { id: 3, name: 'WhatsApp' }, ...o }, 'bot-secret').expect(200);
const settled = (id) => until(async () => pending() === 0 && (await Ticket.findOne({ 'chatwoot.conversationId': id }))?.ai.lastRunAt, 5000);

test('first message from an unknown number → phone-only customer + whatsapp ticket; bot replies in plain text ≤ 4096', async () => {
  groq.out = { intent: 'payment_pending', category: 'Billing', priority: 'medium', confidence: 0.95, triggers: [], sources: [SLUG], summary: 's',
    answer: '**Good news:** your payment is safe.\n\n1. Wait *30 minutes*.\n2. Refresh [Billing](https://x.test/billing).\n\n' + 'x'.repeat(5000) };
  const id = ++conv;
  await incoming(id, '+919800000001', 'Paid via UPI but plan inactive');
  await settled(id);
  const t = await Ticket.findOne({ 'chatwoot.conversationId': id });
  expect(t).toMatchObject({ channel: 'whatsapp', subject: 'Paid via UPI but plan inactive', status: 'ai_handling', chatwoot: expect.objectContaining({ syncState: 'synced' }) });
  const u = await User.findById(t.customerId);
  expect(u).toMatchObject({ phone: '+919800000001', name: 'Ravi Kumar' });
  expect(u.email).toBeUndefined();
  expect(t.ai.tier).toBe('auto');
  const [, convId, sent, as] = cw.named('createMessage').find((c) => !c[2].isPrivate);
  expect([convId, as]).toEqual([id, 'bot']);
  expect(sent.content.length).toBeLessThanOrEqual(4096);
  expect(sent.content).toMatch(/^Good news: your payment is safe\.\n\n1\. Wait 30 minutes\.\n2\. Refresh Billing \(https:\/\/x\.test\/billing\)\./);
  expect(sent.content).not.toMatch(/\*\*|\]\(/);
  const msgs = await Message.find({ ticketId: t._id }).sort({ createdAt: 1 });
  expect(msgs.map((m) => m.author)).toEqual(['customer', 'ai']);
  expect(mailer.sent).toHaveLength(0);   // phone-only: no email, in-app only
});

test('number of a portal user → their ticket, listed with channel whatsapp; replies only on WhatsApp; follow-ups/retries stored once', async () => {
  const a = await signUp(app, 'Linked User');
  await a.patch('/api/me').send({ phone: '+91 98000 00002' }).expect(200);
  groq.out = { intent: 'x', category: 'General', priority: 'low', confidence: 0.2, triggers: [], sources: [], summary: '', answer: '' };
  const id = ++conv;
  await incoming(id, '+919800000002', 'मेरा डैशबोर्ड नहीं खुल रहा');
  await settled(id);
  const list = (await a.get('/api/tickets?scope=all').expect(200)).body.items;
  expect(list[0]).toMatchObject({ channel: 'whatsapp', subject: 'मेरा डैशबोर्ड नहीं खुल रहा', status: 'in_progress' });   // human tier
  const t = await Ticket.findOne({ 'chatwoot.conversationId': id });
  expect(t.locale).toBe('hi');
  expect((await a.post(`/api/tickets/${t.number}/messages`).send({ body: 'hello', clientMessageId: crypto.randomUUID() }).expect(409)).body.error.code)
    .toBe('WHATSAPP_TICKET');
  // follow-up while a human has it: stored, no bot run; same Chatwoot message id again → not duplicated
  const runs = groq.calls;
  await incoming(id, '+919800000002', 'any update?', { id: 777_001, conversation: conversation(id, { status: 'open' }) });
  await incoming(id, '+919800000002', 'any update?', { id: 777_001, conversation: conversation(id, { status: 'open' }) });
  await until(async () => (await Message.countDocuments({ ticketId: t._id, author: 'customer' })) === 2);
  await new Promise((r) => setTimeout(r, 100));
  expect(await Message.countDocuments({ ticketId: t._id, author: 'customer' })).toBe(2);
  expect(groq.calls).toBe(runs);
  expect(await Ticket.countDocuments({ 'chatwoot.conversationId': id })).toBe(1);
  // agent reply (outgoing via the bot webhook) reaches the portal; agent resolves → Resolved
  await signed(app, '/bot/chatwoot', { event: 'message_created', id: 777_002, message_type: 'outgoing', private: false, content: 'Fixed now',
    created_at: new Date().toISOString(), sender: { type: 'user', name: 'Agent A' }, conversation: conversation(id, { status: 'open' }) }, 'bot-secret').expect(200);
  await until(async () => Message.exists({ ticketId: t._id, author: 'agent', body: 'Fixed now' }));
  await signed(app, '/bot/chatwoot', { event: 'conversation_status_changed', ...conversation(id, { status: 'resolved' }),
    updated_at: Math.floor(Date.now() / 1000) + 5 }, 'bot-secret').expect(200);
  await until(async () => (await Ticket.findById(t._id)).status === 'resolved');
});

test('no phone on the sender → ignored; portal-inbox events still go the old way', async () => {
  const id = ++conv;
  await incoming(id, '', 'hi');
  await new Promise((r) => setTimeout(r, 100));
  expect(await Ticket.countDocuments({ 'chatwoot.conversationId': id })).toBe(0);
});

test('plainText: strips markdown, keeps text, caps at 4096', () => {
  expect(plainText('## Steps\n- **one** and _two_\n- `three`\n> quote')).toBe('Steps\n• one and two\n• three\nquote');
  expect(plainText('a'.repeat(5000))).toHaveLength(4096);
  expect(plainText('snake_case_name stays')).toBe('snake_case_name stays');
});
