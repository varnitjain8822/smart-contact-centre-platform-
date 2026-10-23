import { expect, test } from 'vitest';
import { KEYWORDS, maxPriority, priorityFloor, scanKeywords } from '../../src/ai/triggers.js';

test.each([
  ['fraud', 'I think this is a scam'], ['security', 'possible data leak here'], ['legal', 'I will go to consumer forum'],
  ['angry_customer', 'This is unacceptable!'], ['payment_dispute', 'I was charged twice'],
  ['account_takeover', 'My account was HACKED'], ['repeated_issue', 'third time asking'],
  ['critical_incident', 'Production down for us'],
])('%s hits', (k, text) => expect(scanKeywords(text)).toContain(k));

test('every keyword of every list hits its trigger', () => {
  for (const [k, ws] of Object.entries(KEYWORDS)) for (const w of ws) expect(scanKeywords(`hello ${w}.`)).toContain(k);
});

test("'issue' does not trigger legal", () => expect(scanKeywords('I have an issue with my invoice')).toEqual([]));

test('priority floor', () => {
  for (const t of ['fraud', 'account_takeover', 'security', 'critical_incident']) expect(priorityFloor([t])).toBe('critical');
  expect(priorityFloor(['legal'])).toBe('high');
  expect(priorityFloor(['angry_customer', 'repeated_issue'])).toBe('high');
  expect(priorityFloor([])).toBe('low');
  expect(maxPriority('medium', 'high')).toBe('high');
  expect(maxPriority('critical', 'low')).toBe('critical');
});
