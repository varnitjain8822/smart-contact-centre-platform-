import { expect, test } from 'vitest';
import { actions, delivery, toTicketDetail } from '../../src/tickets/dto.js';
import { dueDates } from '../../src/sla/sla.js';

const c = new Date('2026-10-15T10:00:00Z');
const t = (o = {}) => ({ number: 'SC-1001', subject: 'Subject', description: 'd'.repeat(20), status: 'ai_handling', priority: 'medium',
  category: 'General', createdAt: c, updatedAt: c, lastMessageAt: c, resolvedAt: null,
  sla: { ...dueDates(c, 'medium'), firstResponseAt: null }, ai: { awaitingAcceptance: false, humanRequested: false, triggers: [] },
  csat: { rating: null }, chatwoot: { syncState: 'synced', attempts: 0 }, statusHistory: [], ...o });

test('action flags', () => {
  expect(actions(t())).toEqual({ canAccept: false, canRequestHuman: true, canResolve: true, canRate: false });
  expect(actions(t({ ai: { awaitingAcceptance: true, humanRequested: false } })).canAccept).toBe(true);
  expect(actions(t({ ai: { humanRequested: true } })).canRequestHuman).toBe(false);
  expect(actions(t({ status: 'in_progress', ai: { awaitingAcceptance: true } })))
    .toEqual({ canAccept: false, canRequestHuman: false, canResolve: true, canRate: false });
  expect(actions(t({ status: 'resolved' }))).toEqual({ canAccept: false, canRequestHuman: false, canResolve: false, canRate: true });
  expect(actions(t({ status: 'resolved', csat: { rating: 4 } })).canRate).toBe(false);
});

test('delivery derivation', () => {
  expect(delivery(t())).toBe('synced');
  expect(delivery(t({ chatwoot: { syncState: 'pending', attempts: 19 } }))).toBe('queued');
  expect(delivery(t({ chatwoot: { syncState: 'pending', attempts: 20 } }))).toBe('delayed');
});

test('detail shape', () => {
  const d = toTicketDetail(t({ status: 'resolved', resolvedAt: new Date(c.getTime() + 60000), csat: { rating: 5, comment: 'ok', submittedAt: c } }), c);
  expect(d.sla.activeDueAt).toBeNull();
  expect(d.sla.state).toBe('met');
  expect(d.csat).toEqual({ rating: 5, comment: 'ok', submittedAt: c.toISOString() });
  expect(Object.keys(d).sort()).toEqual(['actions', 'ai', 'aiTier', 'category', 'createdAt', 'csat', 'customerCategory', 'delivery',
    'description', 'lastMessageAt', 'number', 'priority', 'resolutionType', 'sla', 'status', 'statusHistory', 'subject', 'updatedAt']);
});
