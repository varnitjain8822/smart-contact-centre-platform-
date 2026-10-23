import { expect, test } from 'vitest';
import { setTimeout as sleep } from 'node:timers/promises';
import { enqueue, pending } from '../../src/ai/queue.js';

test('same key sequential, different keys concurrent, rejection does not break chain, map drained', async () => {
  const ev = [];
  const job = (name, ms, fail) => async () => { ev.push(`${name}+`); await sleep(ms); ev.push(`${name}-`); if (fail) throw new Error('x'); };
  const all = [enqueue('a', job('a1', 30, true)), enqueue('a', job('a2', 5)), enqueue('b', job('b1', 5))];
  await Promise.all(all);
  expect(ev.indexOf('a1-')).toBeLessThan(ev.indexOf('a2+'));
  expect(ev.indexOf('b1+')).toBeLessThan(ev.indexOf('a1-'));
  expect(ev).toContain('a2-');
  await sleep(0);
  expect(pending()).toBe(0);
});
