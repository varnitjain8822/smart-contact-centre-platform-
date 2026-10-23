import { createHmac } from 'node:crypto';
import { expect, test } from 'vitest';
import { verifySignature } from '../../src/chatwoot/signature.js';

const body = Buffer.from('{"event":"message_created"}');
const now = 1_760_000_000;
const sign = (secret, ts, b = body) => `sha256=${createHmac('sha256', secret).update(`${ts}.${b}`).digest('hex')}`;
const code = (fn) => { try { fn(); return 'ok'; } catch (e) { return `${e.status} ${e.code}`; } };

test('valid', () => expect(code(() => verifySignature(body, String(now), sign('s', now), 's', now, 300))).toBe('ok'));
test('wrong secret', () => expect(code(() => verifySignature(body, String(now), sign('x', now), 's', now, 300))).toBe('401 INVALID_SIGNATURE'));
test('tampered body', () => expect(code(() => verifySignature(Buffer.from('{}'), String(now), sign('s', now), 's', now, 300))).toBe('401 INVALID_SIGNATURE'));
test('stale ts 301 s', () => expect(code(() => verifySignature(body, String(now - 301), sign('s', now - 301), 's', now, 300))).toBe('401 STALE_WEBHOOK'));
test('missing headers', () => {
  expect(code(() => verifySignature(body, undefined, sign('s', now), 's', now, 300))).toBe('401 INVALID_SIGNATURE');
  expect(code(() => verifySignature(body, String(now), undefined, 's', now, 300))).toBe('401 INVALID_SIGNATURE');
});
test('non-hex sig', () => expect(code(() => verifySignature(body, String(now), 'sha256=zzzz', 's', now, 300))).toBe('401 INVALID_SIGNATURE'));

test('receive: responds 200 before running the handler', async () => {
  const { receive } = await import('../../src/chatwoot/signature.js');
  const order = [];
  const ts = String(Math.floor(Date.now() / 1000));
  const headers = { 'x-chatwoot-timestamp': ts, 'x-chatwoot-signature': sign('s', ts) };
  const req = { body: body, get: (h) => headers[h.toLowerCase()] };
  const res = { json: (b) => order.push(['response', b]) };
  await receive('s', 'inbox', async (p) => order.push(['handler', p.event]))(req, res);
  expect(order).toEqual([['response', { ok: true }]]);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  expect(order).toEqual([['response', { ok: true }], ['handler', 'message_created']]);
});
