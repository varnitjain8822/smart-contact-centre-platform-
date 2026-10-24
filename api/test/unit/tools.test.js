import { afterEach, expect, test, vi } from 'vitest';
import { complete, parseToolCalls } from '../../src/ai/groq.js';
import { matches, normDate, redact, toolSpecs } from '../../src/ai/tools.js';
import { cfg } from '../../src/config.js';

afterEach(() => { vi.unstubAllGlobals(); cfg.GROQ_API_KEY = ''; });

test('parseToolCalls: OpenAI/Groq tool_calls format; arguments JSON string; malformed → {}', () => {
  const msg = { role: 'assistant', content: null, tool_calls: [
    { id: 'call_1', type: 'function', function: { name: 'get_card_status', arguments: '{"last4":"1234"}' } },
    { id: 'call_2', type: 'function', function: { name: 'get_payslip', arguments: '{bad json' } },
    { id: 'call_3', type: 'function', function: { name: 'x', arguments: '[1,2]' } },
    { id: 'call_4', type: 'function' }] };
  expect(parseToolCalls(msg)).toEqual([{ id: 'call_1', name: 'get_card_status', args: { last4: '1234' } },
    { id: 'call_2', name: 'get_payslip', args: {} }, { id: 'call_3', name: 'x', args: {} }]);
  expect(parseToolCalls({ content: 'hi' })).toEqual([]);
});

test('complete({tools}): no JSON mode, tool_choice auto, returns toolCalls; tool_use_failed 400 → no calls', async () => {
  cfg.GROQ_API_KEY = 'k';
  const bodies = [];
  const tools = toolSpecs({ tools: [{ name: 'get_order_status', description: 'd', parameters: { type: 'object', properties: { orderNo: { type: 'string' } } } }] });
  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    bodies.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null,
      tool_calls: [{ id: 'c1', type: 'function', function: { name: 'get_order_status', arguments: '{"orderNo":"AC-1"}' } }] } }] }), { status: 200 });
  }));
  const r = await complete([{ role: 'user', content: 'x' }], { tools });
  expect(r.toolCalls).toEqual([{ id: 'c1', name: 'get_order_status', args: { orderNo: 'AC-1' } }]);
  expect(bodies[0]).toMatchObject({ tools, tool_choice: 'auto' });
  expect(bodies[0].response_format).toBeUndefined();
  expect(tools[0]).toEqual({ type: 'function', function: { name: 'get_order_status', description: 'd', parameters: expect.any(Object) } });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'tool_use_failed' } }), { status: 400 })));
  expect(await complete([], { tools })).toEqual({ content: '', toolCalls: [], message: null });
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 400 })));
  await expect(complete([], { tools })).rejects.toMatchObject({ code: 'http_400' });
});

test('matches / normDate', () => {
  expect(matches('AC-1001', 'ac 1001')).toBe(true);
  expect(matches('4111 1111 1111 1234', '1234')).toBe(true);
  expect(matches('1234', '123')).toBe(false);
  expect(matches('black backpack', 'Backpack')).toBe(true);
  expect(matches('AC-1001', 'AC-10')).toBe(false);
  expect(normDate('14/05/1990')).toBe('1990-05-14');
  expect(normDate('1990-5-14')).toBe('1990-05-14');
  for (const m of ['2026-07', '07/2026', 'July 2026', 'jul-2026', 'July, 2026']) expect(normDate(m)).toBe('2026-07');
  expect(matches('2026-07', 'July 2026')).toBe(true);
});

test('redact: card/account numbers → XXXX + last 4 at any depth; foreign public record loses personal fields', () => {
  expect(redact({ cardNumber: '4111 1111 1111 1234', accounts: [{ accountNumber: 12345678901 }], last4: '1234', customerKey: 'a', mock: true, total: 2499 }))
    .toEqual({ cardNumber: 'XXXX1234', accounts: [{ accountNumber: 'XXXX8901' }], last4: '1234', total: 2499 });
  expect(redact({ item: 'bag', claimantName: 'Ben', phone: '+91', email: 'b@x', location: 'Store' }, true)).toEqual({ item: 'bag', location: 'Store' });
});
