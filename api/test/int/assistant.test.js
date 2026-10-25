import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import * as realGroq from '../../src/ai/groq.js';
import { cfg } from '../../src/config.js';
import { deps } from '../../src/deps.js';
import { AiError } from '../../src/lib/errors.js';
import { setup, signUp } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, groq, a;
beforeAll(async () => { await startDb(); ({ app, groq } = await setup()); a = await signUp(app); });
afterAll(stopDb);
beforeEach(() => { deps.groq = groq; groq.chunks = null; groq.streamFail = null; groq.midFail = null; groq.last = null; });

const SLUG = 'payment-pending-subscription-not-active';
const ask = (agent, content = 'My payment was deducted but the plan is inactive', extra = {}) =>
  agent.post('/api/assistant/chat').send({ messages: [{ role: 'user', content }], ...extra });
/** parse an SSE body into [{event, data}] */
const events = (text) => text.split('\n\n').filter((b) => b.startsWith('event: ')).map((b) => {
  const [e, d] = b.split('\n'); return { event: e.slice(7), data: JSON.parse(d.slice(6)) };
});
const tokens = (ev) => ev.filter((e) => e.event === 'token').map((e) => e.data.t).join('');

test('streams token events, then sources (only prompt articles), then done; META line never shown', async () => {
  groq.chunks = ['1. Wait 30 minutes.', '\n2. Refresh Billing.', '\n<<MET', `A {"sources":["${SLUG}","invented-slug"],"confidence":0.9}>>`];
  const r = await ask(a).expect(200);
  expect(r.headers['content-type']).toMatch(/^text\/event-stream/);
  expect(r.headers['cache-control']).toBe('no-cache, no-transform');
  expect(r.headers['content-encoding']).toBeUndefined();
  const ev = events(r.text);
  expect(tokens(ev)).toBe('1. Wait 30 minutes.\n2. Refresh Billing.\n');
  expect(ev.slice(-2)).toEqual([
    { event: 'sources', data: { sources: [{ slug: SLUG, title: 'Payment Pending / Subscription Not Active' }], usedRecords: false } },
    { event: 'done', data: { suggestTicket: false } },
  ]);
  expect(groq.last[0].content).toContain(`[slug: ${SLUG}]`);
  expect(groq.last[0].content).toContain('Reply in English');
  expect(groq.last.at(-1)).toEqual({ role: 'user', content: 'My payment was deducted but the plan is inactive' });
});

test('suggestTicket on low confidence, missing META, no valid sources, or a trigger keyword', async () => {
  const done = async (chunks, content) => { groq.chunks = chunks; return events((await ask(a, content).expect(200)).text).at(-1).data.suggestTicket; };
  expect(await done(['Not sure.', `<<META {"sources":["${SLUG}"],"confidence":0.3}>>`])).toBe(true);
  expect(await done(['No meta at all.'])).toBe(true);
  expect(await done(['x', '<<META {"sources":["invented"],"confidence":0.95}>>'])).toBe(true);
  expect(await done(['x', `<<META {"sources":["${SLUG}"],"confidence":0.95}>>`], 'I think this is fraud, payment deducted')).toBe(true);
});

test('Groq unavailable before streaming → 503 AI_UNAVAILABLE JSON; mid-stream failure → error event then done{suggestTicket:true}', async () => {
  groq.streamFail = new AiError('http_500');
  const r = await ask(a).expect(503);
  expect(r.body.error.code).toBe('AI_UNAVAILABLE');
  groq.streamFail = null;
  groq.chunks = ['Partial ans'];
  groq.midFail = new Error('socket hang up');
  const ev = events((await ask(a).expect(200)).text);
  expect(tokens(ev)).toBe('Partial ans');
  expect(ev.slice(-3).map((e) => e.event)).toEqual(['error', 'sources', 'done']);
  expect(ev.at(-3).data.code).toBe('AI_UNAVAILABLE');
  expect(ev.at(-1).data).toEqual({ suggestTicket: true });
});

test('no GROQ_API_KEY (real client) → 503 AI_UNAVAILABLE', async () => {
  deps.groq = realGroq;
  expect((await ask(a).expect(503)).body.error).toMatchObject({ code: 'AI_UNAVAILABLE' });
});

test('locale: body locale wins, else the user locale; Hindi retrieval returns Hindi source titles', async () => {
  groq.chunks = ['ठीक है', `<<META {"sources":["${SLUG}"],"confidence":0.9}>>`];
  const ev = events((await ask(a, 'पेमेंट कट गया लेकिन प्लान चालू नहीं हुआ', { locale: 'hi' }).expect(200)).text);
  expect(groq.last[0].content).toContain('Reply in Hindi');
  expect(groq.last[0].content).toContain(`[slug: ${SLUG}] पेमेंट पेंडिंग है`);
  expect(ev.find((e) => e.event === 'sources').data.sources[0].title).toBe('पेमेंट पेंडिंग है / सब्सक्रिप्शन चालू नहीं हुआ');
  const h = await signUp(app, 'Hindi User');
  await h.patch('/api/me').send({ locale: 'hi' }).expect(200);
  groq.chunks = ['x'];
  await ask(h).expect(200);
  expect(groq.last[0].content).toContain('Reply in Hindi');
});

test('validation, history cap and 30 per 10 min rate limit', async () => {
  await a.post('/api/assistant/chat').send({ messages: [{ role: 'assistant', content: 'x' }] }).expect(400);
  await a.post('/api/assistant/chat').send({ messages: [] }).expect(400);
  await a.post('/api/assistant/chat').send({ messages: Array(21).fill({ role: 'user', content: 'x' }) }).expect(400);
  await a.post('/api/assistant/chat').send({ messages: [{ role: 'system', content: 'x' }] }).expect(400);
  groq.chunks = ['ok'];
  const long = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `turn ${i}` }));
  await a.post('/api/assistant/chat').send({ messages: long }).expect(200);
  expect(groq.last.slice(1).map((m) => m.content)).toEqual(long.slice(-10).map((m) => m.content));
  const b = await signUp(app, 'Rate Limited');
  for (let i = 0; i < 30; i++) await ask(b, 'hello').expect(200);
  expect((await ask(b, 'hello').expect(429)).body.error.code).toBe('RATE_LIMITED');
});

test('end to end with the real Groq client against e2e/groq-stub.mjs (stream:true)', async () => {
  const port = 18000 + Math.floor(Math.random() * 1000);
  const stub = spawn(process.execPath, [fileURLToPath(new URL('../../../e2e/groq-stub.mjs', import.meta.url))], { env: { ...process.env, PORT: String(port) } });
  try {
    await new Promise((resolve, reject) => { stub.stdout.on('data', (d) => String(d).includes('groq-stub on') && resolve()); stub.on('error', reject); });
    Object.assign(cfg, { GROQ_API_KEY: 'stub-key', GROQ_URL: `http://127.0.0.1:${port}` });
    deps.groq = realGroq;
    const ev = events((await ask(a).expect(200)).text);
    expect(tokens(ev)).toContain('Wait 30 minutes');
    expect(tokens(ev)).not.toContain('META');
    expect(ev.find((e) => e.event === 'sources').data.sources.map((s) => s.slug)).toEqual([SLUG]);
    expect(ev.at(-1).data).toEqual({ suggestTicket: false });
    const unsure = events((await ask(a, 'How do I change my company logo?').expect(200)).text);
    expect(unsure.at(-1).data).toEqual({ suggestTicket: true });
  } finally {
    stub.kill();
    Object.assign(cfg, { GROQ_API_KEY: undefined, GROQ_URL: 'https://api.groq.com/openai/v1' });
  }
});
