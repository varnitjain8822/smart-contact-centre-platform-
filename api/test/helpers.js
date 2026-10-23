import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { vi } from 'vitest';
import { createApp } from '../src/app.js';
import { ChatwootError } from '../src/lib/errors.js';
import { upsertArticles } from '../src/seed/kb.js';

export function fakeChatwoot() {
  let conv = 100, msg = 1000;
  const f = { down: false, calls: [], conversation: null, messages: [] };
  const fn = (name, impl) => vi.fn(async (...args) => {
    f.calls.push([name, ...args]);
    if (f.down === true || f.down === name) throw new ChatwootError(503, `/${name}`, 'down');
    return impl(...args);
  });
  Object.assign(f, {
    createContact: fn('createContact', async () => ({ contactId: 1, sourceId: 'src-1' })),
    findContactByIdentifier: fn('findContactByIdentifier', async () => null),
    createConversation: fn('createConversation', async () => ({ id: ++conv, status: 'pending' })),
    updateContact: fn('updateContact', async () => ({})),
    findConversationByTicket: fn('findConversationByTicket', async () => f.existingConversation ?? null),
    createMessage: fn('createMessage', async (convId, p) => ({ id: ++msg, created_at: Math.floor(Date.now() / 1000), content: p.content, message_type: 1 })),
    toggleStatus: fn('toggleStatus', async () => ({})),
    togglePriority: fn('togglePriority', async () => ({})),
    setLabels: fn('setLabels', async (id, labels) => labels),
    setCustomAttributes: fn('setCustomAttributes', async () => ({})),
    getConversation: fn('getConversation', async () => f.conversation),
    listMessages: fn('listMessages', async () => f.messages),
    downloadAttachment: fn('downloadAttachment', async (url) => f.files?.[url] ?? { buffer: Buffer.from('agent file'), contentType: 'text/plain' }),
    ping: async () => !f.down,
  });
  f.named = (name) => f.calls.filter((c) => c[0] === name);
  f.reset = () => { f.calls.length = 0; f.down = false; };
  return f;
}

export function fakeGroq() {
  const g = { out: null, fail: null, calls: 0 };
  g.complete = vi.fn(async (messages) => {
    g.calls++; g.last = messages;
    if (g.fail) throw g.fail;
    return typeof g.out === 'function' ? g.out(messages) : g.out;
  });
  // stream(): g.chunks = ['a', 'b'] (or a function of messages); g.streamFail / g.midFail to simulate errors
  g.stream = vi.fn(async (messages) => {
    g.calls++; g.last = messages;
    if (g.streamFail) throw g.streamFail;
    const chunks = typeof g.chunks === 'function' ? g.chunks(messages) : g.chunks ?? [];
    return (async function* () { for (const c of chunks) yield c; if (g.midFail) throw g.midFail; })();
  });
  g.configured = () => true;
  return g;
}

export function fakeMailer() {
  const m = { sent: [], fail: null };
  m.send = vi.fn(async (msg) => { if (m.fail) throw m.fail; m.sent.push(msg); return { messageId: `m${m.sent.length}` }; });
  return m;
}

export async function setup() {
  const chatwoot = fakeChatwoot();
  const groq = fakeGroq();
  const mailer = fakeMailer();
  const app = createApp({ chatwoot, groq, mailer });
  await upsertArticles();
  return { app, chatwoot, groq, mailer };
}

let ipSeq = 1;
/** registers a fresh user; returns a supertest agent carrying the session cookie */
export async function signUp(app, name = 'Priya Shah') {
  const agent = request.agent(app);
  const email = `u${Date.now()}${ipSeq}@example.com`;
  await agent.post('/api/auth/register').set('X-Forwarded-For', `10.0.0.${ipSeq++}`).send({ name, email, password: 's3cure-pass' }).expect(201);
  return agent;
}

export const newTicket = (agent, o = {}) => agent.post('/api/tickets').send({
  subject: 'Payment deducted but plan inactive', description: 'I paid 4999 yesterday via UPI and the plan is still inactive.', category: 'Billing', ...o });

export function signed(app, path, payload, secret, { ts = Math.floor(Date.now() / 1000), delivery = randomUUID(), sig } = {}) {
  const body = JSON.stringify(payload);
  const r = request(app).post(path).set('Content-Type', 'application/json').set('X-Chatwoot-Timestamp', String(ts))
    .set('X-Chatwoot-Signature', sig ?? `sha256=${createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')}`);
  if (delivery) r.set('X-Chatwoot-Delivery', delivery);
  return r.send(body);
}

/** wait until fn() is truthy (webhook handlers run after the response) */
export async function until(fn, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error('until: timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
}
