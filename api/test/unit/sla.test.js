import { expect, test } from 'vitest';
import { activeDue, dueDates, state } from '../../src/sla/sla.js';

const c = new Date('2026-10-15T10:00:00Z');
const min = (m) => new Date(c.getTime() + m * 60000);
const ticket = (p, extra = {}) => ({ createdAt: c, status: 'in_progress', resolvedAt: null,
  ...extra, sla: { ...dueDates(c, p), firstResponseAt: null, ...extra.sla } });

test('due dates per priority', () => {
  expect(dueDates(c, 'critical')).toEqual({ responseDueAt: min(15), resolutionDueAt: min(120) });
  expect(dueDates(c, 'high')).toEqual({ responseDueAt: min(60), resolutionDueAt: min(240) });
  expect(dueDates(c, 'medium')).toEqual({ responseDueAt: min(240), resolutionDueAt: min(720) });
  expect(dueDates(c, 'low')).toEqual({ responseDueAt: min(1440), resolutionDueAt: min(2880) });
});

test('on_track / at_risk boundary at 25 %', () => {
  const t = ticket('medium');                       // response due at +240 min; 25 % = 60 min left
  expect(state(t, min(179))).toBe('on_track');
  expect(state(t, min(180))).toBe('at_risk');
  expect(state(t, min(240))).toBe('at_risk');
});

test('breached after due', () => expect(state(ticket('critical'), min(16))).toBe('breached'));

test('active due switches to resolution after first response', () => {
  const t = ticket('critical', { sla: { firstResponseAt: min(10) } });
  expect(activeDue(t)).toEqual(min(120));
  expect(state(t, min(20))).toBe('on_track');
});

test('late first response → breached', () =>
  expect(state(ticket('critical', { sla: { firstResponseAt: min(20) } }), min(21))).toBe('breached'));

test('resolved → met or breached', () => {
  expect(state(ticket('critical', { status: 'resolved', resolvedAt: min(100), sla: { firstResponseAt: min(5) } }))).toBe('met');
  expect(state(ticket('critical', { status: 'resolved', resolvedAt: min(10) }))).toBe('met');
  expect(state(ticket('critical', { status: 'resolved', resolvedAt: min(130), sla: { firstResponseAt: min(5) } }))).toBe('breached');
  expect(state(ticket('critical', { status: 'resolved', resolvedAt: min(100), sla: { firstResponseAt: min(30) } }))).toBe('breached');
});
