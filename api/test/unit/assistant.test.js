import { afterEach, expect, test, vi } from 'vitest';
import { buildAssistantMessages, capHistory, metaSplitter } from '../../src/ai/assistant.js';
import { stream } from '../../src/ai/groq.js';
import { cfg } from '../../src/config.js';

afterEach(() => { vi.unstubAllGlobals(); cfg.GROQ_API_KEY = undefined; });

test('capHistory: last 10 turns, then ≤ 4000 chars dropping oldest; a single huge message is truncated', () => {
  const msgs = Array.from({ length: 14 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
  expect(capHistory(msgs).map((m) => m.content)).toEqual(['m4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm13']);
  const big = [{ role: 'user', content: 'a'.repeat(3000) }, { role: 'assistant', content: 'b'.repeat(900) }, { role: 'user', content: 'c'.repeat(200) }];
  expect(capHistory(big).map((m) => m.content[0])).toEqual(['b', 'c']);
  expect(capHistory([{ role: 'user', content: 'x'.repeat(4500) }])[0].content).toHaveLength(4000);
});

test('metaSplitter hides the META line even when the marker is split across deltas', () => {
  const out = [];
  const s = metaSplitter((t) => out.push(t));
  for (const d of ['Wait 30 ', 'minutes.\n<', '<ME', 'TA {"sources":["a"],', '"confidence":0.9}>>']) s.push(d);
  expect(s.end()).toEqual({ sources: ['a'], confidence: 0.9 });
  expect(out.join('')).toBe('Wait 30 minutes.\n');
  const plain = metaSplitter((t) => out.push(t));
  out.length = 0;
  plain.push('a < b <<'); plain.push(' c');
  expect(plain.end()).toBeNull();
  expect(out.join('')).toBe('a < b << c');
});

test('assistant prompt carries articles, the language line and the history', () => {
  const [sys, ...rest] = buildAssistantMessages([{ role: 'user', content: 'hi' }], [{ slug: 's1', title: 'T', category: 'Billing', body: 'B' }], 'hi');
  expect(sys.role).toBe('system');
  expect(sys.content).toContain('[slug: s1] T (Billing)');
  expect(sys.content).toContain('Reply in Hindi');
  expect(sys.content).toContain('<<META');
  expect(rest).toEqual([{ role: 'user', content: 'hi' }]);
  expect(buildAssistantMessages([], [], 'en')[0].content).toContain('Reply in English');
});

const sse = (lines) => new Response(new ReadableStream({ start(c) { for (const l of lines) c.enqueue(new TextEncoder().encode(l)); c.close(); } }), { status: 200 });

test('groq.stream: requires key; sends stream:true; parses data lines split across chunks; stops at [DONE]; http error → AiError', async () => {
  await expect(stream([])).rejects.toMatchObject({ code: 'not_configured' });
  cfg.GROQ_API_KEY = 'k';
  const chunk = (t) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;
  const all = chunk('Hel') + chunk('lo') + ': keepalive\n\n' + 'data: [DONE]\n\n' + chunk('ignored');
  const f = vi.fn(async () => sse([all.slice(0, 20), all.slice(20, 45), all.slice(45)]));
  vi.stubGlobal('fetch', f);
  let text = '';
  for await (const d of await stream([{ role: 'user', content: 'x' }])) text += d;
  expect(text).toBe('Hello');
  expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ stream: true, model: cfg.GROQ_MODEL });
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
  await expect(stream([])).rejects.toMatchObject({ code: 'http_500' });
});
