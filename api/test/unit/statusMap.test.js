import { expect, test } from 'vitest';
import { mapStatus, priorityFromCw, priorityToCw } from '../../src/chatwoot/statusMap.js';

test('status map', () => {
  expect(mapStatus('pending')).toBe('ai_handling');
  expect(mapStatus('open')).toBe('in_progress');
  expect(mapStatus('snoozed')).toBe('waiting_on_customer');
  expect(mapStatus('resolved')).toBe('resolved');
  expect(mapStatus('weird')).toBeNull();
  expect(mapStatus(undefined)).toBeNull();
});

test('urgent ↔ critical', () => {
  expect(priorityFromCw.urgent).toBe('critical');
  expect(priorityToCw.critical).toBe('urgent');
  for (const p of ['low', 'medium', 'high']) expect(priorityToCw[priorityFromCw[p]]).toBe(p);
});
