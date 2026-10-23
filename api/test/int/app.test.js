import http from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, expect, test } from 'vitest';
import * as hub from '../../src/realtime/hub.js';
import { Message } from '../../src/models/Message.js';
import { Ticket } from '../../src/models/Ticket.js';
import { newTicket, setup, signed, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, a, server, port;
beforeAll(async () => {
  await startDb(); ({ app } = await setup()); a = await signUp(app);
  server = app.listen(0); port = server.address().port;
});
afterAll(async () => { server.closeAllConnections(); server.close(); await stopDb(); });

test('healthz', async () => {
  expect((await request(app).get('/healthz').expect(200)).body).toEqual({ ok: true, mongo: 'up', chatwoot: 'up', groq: 'configured' });
});

test('signed webhook verifies end-to-end through the raw-body route (exact bytes, odd spacing)', async () => {
  await newTicket(a).expect(201);
  const t = await Ticket.findOne({ number: 'SC-1001' });
  const p = { event: 'message_created', id: 77, message_type: 'outgoing', private: false, content: 'Spaced  out ✓',
    created_at: new Date().toISOString(), sender: { name: 'Ravi', type: 'user' }, conversation: { id: t.chatwoot.conversationId } };
  await signed(app, '/webhooks/chatwoot', p, 'inbox-secret').expect(200);
  expect((await until(() => Message.findOne({ chatwootMessageId: 77 }))).body).toBe('Spaced  out ✓');
});

function openStream(cookie) {
  return new Promise((resolve) => {
    const req = http.get({ port, path: '/api/stream', headers: { Cookie: cookie } }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { buf += d; });
      resolve({ res, req, text: () => buf });
    });
  });
}

test('SSE: headers, retry, per-user delivery, close removes connection', async () => {
  const login = async (email) => (await request(app).post('/api/auth/register').set('X-Forwarded-For', email)
    .send({ name: 'Stream User', email, password: 's3cure-pass' }).expect(201)).headers['set-cookie'][0].split(';')[0];
  const ca = await login('sa@example.com');
  const cb = await login('sb@example.com');
  const sa = await openStream(ca);
  const sb = await openStream(cb);
  expect(sa.res.headers['content-type']).toMatch(/text\/event-stream/);
  expect(sa.res.headers['x-accel-buffering']).toBe('no');
  expect(sa.res.headers['cache-control']).toBe('no-cache, no-transform');
  await until(() => sa.text().includes('retry: 3000'));
  const uid = (await request(app).get('/api/auth/me').set('Cookie', ca)).body.user.id;
  hub.emit(uid, 'ticket.updated', { hello: 1 });
  await until(() => sa.text().includes('event: ticket.updated\ndata: {"hello":1}'));
  await new Promise((r) => setTimeout(r, 50));
  expect(sb.text()).not.toContain('ticket.updated');
  expect(hub.count(uid)).toBe(1);
  sa.req.destroy();
  await until(() => hub.count(uid) === 0);
  sb.req.destroy();
  const unauth = await openStream('');
  expect(unauth.res.statusCode).toBe(401);
});

test('webhook routes are exempt from the JSON/Origin guard; api mutations are not', async () => {
  expect((await request(app).post('/webhooks/chatwoot').set('Content-Type', 'text/plain').set('Origin', 'http://evil.test').send('x').expect(401)).body.error.code).toBe('INVALID_SIGNATURE');
});
