import { expect, test } from 'vitest';
import { AiOutput } from '../../src/ai/schema.js';
import { SYSTEM, buildMessages } from '../../src/ai/prompt.js';

const ok = { intent: 'payment_pending', category: 'Billing', priority: 'high', confidence: 0.9, triggers: [], answer: 'a', sources: ['x'], summary: 's' };

test('coercions', () => {
  const o = AiOutput.parse({ ...ok, category: 'Nope', priority: 'urgent', confidence: '1.7', triggers: ['fraud', 'bogus'],
    answer: 'x'.repeat(2000), summary: 'y'.repeat(400), intent: 'z'.repeat(50), sources: 'bad' });
  expect(o).toMatchObject({ category: 'General', priority: 'medium', confidence: 1, triggers: ['fraud'], intent: 'unknown', sources: [] });
  expect(o.answer).toHaveLength(1200);
  expect(o.summary).toHaveLength(300);
  expect(AiOutput.parse({ ...ok, confidence: -3 }).confidence).toBe(0);
  expect(AiOutput.parse({ confidence: 0.5 })).toEqual({ intent: 'unknown', category: 'General', priority: 'medium', confidence: 0.5,
    triggers: [], answer: '', sources: [], summary: '' });
});

test('missing / NaN confidence throws', () => {
  expect(() => AiOutput.parse({ ...ok, confidence: undefined })).toThrow();
  expect(() => AiOutput.parse({ ...ok, confidence: 'abc' })).toThrow();
});

test('prompt', () => {
  const arts = [{ slug: 'pay-1', title: 'Pay', category: 'Billing', body: 'b'.repeat(2000) }];
  const msgs = Array.from({ length: 12 }, (_, i) => ({ author: i % 2 ? 'ai' : 'customer', body: `m${i} ${'c'.repeat(2000)}` }));
  msgs.push({ author: 'system', body: 'SYSTEM-NOTE' });
  const [sys, user] = buildMessages('ticket', { number: 'SC-1001', subject: 'Help' }, arts, msgs);
  expect(sys).toEqual({ role: 'system', content: SYSTEM });
  expect(SYSTEM).toContain('JSON');
  expect(SYSTEM.startsWith('You are the first-line support assistant for SmartCC')).toBe(true);
  expect(user.content).toContain('MODE: ticket\nTICKET: SC-1001\nSUBJECT: Help');
  expect(user.content).toContain('[slug: pay-1] Pay (Billing)');
  expect(user.content).not.toContain('b'.repeat(1501));
  expect(user.content).not.toContain('c'.repeat(1500));
  expect(user.content).not.toContain('m1 ');
  expect(user.content).toContain('CUSTOMER: m2 ');
  expect(user.content).toContain('ASSISTANT: m11 ');
  expect(user.content).not.toContain('SYSTEM-NOTE');
  expect((user.content.match(/\[slug: /g) ?? []).length).toBe(1);
  expect(buildMessages('suggestion', {}, [], [{ author: 'customer', body: 'x' }])[1].content)
    .toContain('TICKET: (not yet submitted)\nSUBJECT: \nARTICLES:\n(no matching articles)\n');
});
