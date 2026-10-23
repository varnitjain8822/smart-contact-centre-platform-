import http from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { cfg } from '../../src/config.js';
import * as hub from '../../src/realtime/hub.js';
import { newTicket, setup, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, a, server, port, cookie;
beforeAll(async () => {
  await startDb(); ({ app } = await setup()); a = await signUp(app);
  server = app.listen(0); port = server.address().port;
  cookie = (await request(app).post('/api/auth/register').set('X-Forwarded-For', '9.9.9.9')
    .send({ name: 'Stream User', email: 'hard@example.com', password: 's3cure-pass' }).expect(201)).headers['set-cookie'][0].split(';')[0];
});
afterAll(async () => { server.closeAllConnections(); server.close(); await stopDb(); });

test('helmet: strict API CSP and security headers on every response', async () => {
  for (const path of ['/healthz', '/api/kb/articles', '/api/nope']) {
    const r = await request(app).get(path);
    expect(r.headers['content-security-policy']).toBe("default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'");
    expect(r.headers['x-frame-options']).toBe('DENY');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['referrer-policy']).toBe('same-origin');
    expect(r.headers['cross-origin-resource-policy']).toBe('same-site');
    expect(r.headers['x-powered-by']).toBeUndefined();
  }
});

test('request id: generated or propagated, returned as X-Request-Id, present in log lines written during the request', async () => {
  const gen = await request(app).get('/healthz');
  expect(gen.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  expect((await request(app).get('/healthz').set('X-Request-Id', 'abc-123')).headers['x-request-id']).toBe('abc-123');
  expect((await request(app).get('/healthz').set('X-Request-Id', 'bad id <script>')).headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  cfg.LOG_LEVEL = 'info';
  try {
    await newTicket(a).set('X-Request-Id', 'req-create-1').expect(201);
    await until(() => spy.mock.calls.some(([l]) => l.includes('"path":"/api/tickets"')));   // access line is written on 'finish'
  } finally { cfg.LOG_LEVEL = 'error'; }
  const lines = spy.mock.calls.map(([l]) => JSON.parse(l));
  spy.mockRestore();
  expect(lines.find((l) => l.evt === 'ticket_created').reqId).toBe('req-create-1');
  expect(lines.find((l) => l.method === 'POST' && l.path === '/api/tickets').reqId).toBe('req-create-1');
});

test('compression: JSON gzipped; SSE never compressed and flushed immediately', async () => {
  const kb = await request(app).get('/api/kb/articles').set('Accept-Encoding', 'gzip');
  expect(kb.headers['content-encoding']).toBe('gzip');
  const r = await new Promise((resolve) => {
    const req = http.get({ port, path: '/api/stream', headers: { Cookie: cookie, 'Accept-Encoding': 'gzip' } }, (res) => {
      let buf = ''; res.setEncoding('utf8'); res.on('data', (d) => { buf += d; });
      resolve({ res, req, text: () => buf });
    });
  });
  expect(r.res.headers['content-encoding']).toBeUndefined();
  await until(() => r.text().includes('retry: 3000'));   // arrives while the stream is still open
  r.req.destroy();
});

test('body limits: JSON over 100 kb rejected', async () => {
  const r = await a.post('/api/ai/suggest').send({ subject: 'x', description: 'y'.repeat(120_000) });
  expect(r.status).toBe(400);
  expect(r.body.error.code).toBe('VALIDATION_FAILED');
});

test('graceful shutdown: hub.closeAll ends every SSE stream with a shutdown event + reconnect hint', async () => {
  const ended = await new Promise((resolve) => {
    http.get({ port, path: '/api/stream', headers: { Cookie: cookie } }, (res) => {
      let buf = ''; res.setEncoding('utf8');
      res.on('data', (d) => { buf += d; if (buf.includes('retry: 3000')) hub.closeAll(); });
      res.on('end', () => resolve(buf));
    });
  });
  expect(ended).toContain('event: shutdown');
  expect(ended).toContain('retry: 1000');
});
