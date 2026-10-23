import { afterEach, expect, test, vi } from 'vitest';
import { cfg } from '../../src/config.js';
import { complete } from '../../src/ai/groq.js';

const reply = (status, body, headers = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
const okBody = { choices: [{ message: { content: '{"confidence":0.9}' } }] };
afterEach(() => { vi.unstubAllGlobals(); cfg.GROQ_API_KEY = undefined; });

test('missing key → not_configured', async () => {
  await expect(complete([])).rejects.toMatchObject({ code: 'not_configured' });
});

test('sends model, temperature, json mode', async () => {
  cfg.GROQ_API_KEY = 'k';
  const f = vi.fn(async () => reply(200, okBody)); vi.stubGlobal('fetch', f);
  expect(await complete([{ role: 'user', content: 'x' }])).toEqual({ confidence: 0.9 });
  const [url, init] = f.mock.calls[0];
  expect(url).toBe(`${cfg.GROQ_URL}/chat/completions`);
  expect(init.headers.Authorization).toBe('Bearer k');
  expect(JSON.parse(init.body)).toMatchObject({ model: cfg.GROQ_MODEL, temperature: 0.2, response_format: { type: 'json_object' } });
});

test('429 then 200 → one retry honouring retry-after', async () => {
  cfg.GROQ_API_KEY = 'k';
  const f = vi.fn().mockResolvedValueOnce(reply(429, '', { 'retry-after': '1' })).mockResolvedValueOnce(reply(200, okBody));
  vi.stubGlobal('fetch', f);
  const t = Date.now();
  expect(await complete([])).toEqual({ confidence: 0.9 });
  expect(Date.now() - t).toBeGreaterThanOrEqual(950);
  expect(f).toHaveBeenCalledTimes(2);
});

test('429 twice → AiError', async () => {
  cfg.GROQ_API_KEY = 'k';
  vi.stubGlobal('fetch', vi.fn(async () => reply(429, '', { 'retry-after': '0.01' })));
  await expect(complete([])).rejects.toMatchObject({ code: 'http_429' });
});

test('timeout aborts', async () => {
  cfg.GROQ_API_KEY = 'k';
  vi.stubGlobal('fetch', (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(init.signal.reason))));
  await expect(complete([])).rejects.toMatchObject({ name: 'TimeoutError' });
});

test('comma-separated keys: round-robin, 429 switches key without waiting', async () => {
  cfg.GROQ_API_KEY = 'a, b,c';
  const f = vi.fn().mockResolvedValueOnce(reply(429, '', { 'retry-after': '5' })).mockImplementation(async () => reply(200, okBody));
  vi.stubGlobal('fetch', f);
  const t = Date.now();
  await complete([]); await complete([]);
  expect(Date.now() - t).toBeLessThan(500);
  const used = f.mock.calls.map(([, init]) => init.headers.Authorization.slice(7));
  expect(new Set(used).size).toBe(3);
  expect(used.every((k) => ['a', 'b', 'c'].includes(k))).toBe(true);
});
