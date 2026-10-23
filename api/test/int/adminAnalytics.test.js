import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { clearProfileCache } from '../../src/admin/analytics.js';
import { AssistantFeedback } from '../../src/models/Feedback.js';
import { Ticket } from '../../src/models/Ticket.js';
import { setup } from '../helpers.js';
import { clearDb, startDb, stopDb } from '../db.js';

let app;
beforeAll(async () => { await startDb(); ({ app } = await setup()); });
afterAll(stopDb);

// fake Chatwoot GET /api/v1/profile: token → profile (account 1 is CHATWOOT_ACCOUNT_ID in test/setup.js)
const PROFILES = {
  'admin-t': { id: 1, accounts: [{ id: 1, role: 'administrator' }] },
  'agent-t': { id: 2, accounts: [{ id: 1, role: 'agent' }] },
  'other-t': { id: 3, accounts: [{ id: 9, role: 'administrator' }] },
};
let profileCalls;
const realFetch = globalThis.fetch;
beforeEach(async () => {
  await clearDb(); clearProfileCache(); profileCalls = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (!String(url).startsWith('http://chatwoot.test/api/v1/profile')) return realFetch(url, init);
    profileCalls++;
    const p = PROFILES[init.headers.api_access_token];
    return new Response(JSON.stringify(p ?? { error: 'Invalid Access Token' }), { status: p ? 200 : 401 });
  });
});
afterEach(() => vi.restoreAllMocks());

const get = (token, qs = '') => {
  const r = request(app).get(`/api/admin/analytics${qs}`);
  return token ? r.set('X-Chatwoot-Token', token) : r;
};
const H = 3600_000;
const at = (iso, plusH = 0) => new Date(new Date(iso).getTime() + plusH * H);
let seq = 1;
const ticket = (createdAt, o = {}) => ({
  number: `SC-${seq++}`, customerId: new mongoose.Types.ObjectId(), subject: 'Some subject here', category: 'General', priority: 'medium',
  status: 'in_progress', locale: 'en', resolutionType: null, resolvedAt: null, createdAt, updatedAt: createdAt,
  sla: { responseDueAt: at(createdAt, 4), resolutionDueAt: at(createdAt, 24), firstResponseAt: null, breachedAt: null },
  ai: { tier: null, intent: 'unknown', confidence: null, triggers: [] }, csat: { rating: null }, ...o,
});

test('auth: 401 without token, 403 for agent / other account / invalid token, profile cached 60 s', async () => {
  await get().expect(401);
  expect((await get('agent-t').expect(403)).body.error.code).toBe('FORBIDDEN');
  await get('other-t').expect(403);
  await get('bogus').expect(403);
  await get('admin-t').expect(200);
  await get('admin-t').expect(200);
  expect(profileCalls).toBe(4);   // admin-t verified once
});

test('CORS: Chatwoot origin allowed (preflight + GET), others not', async () => {
  const pre = await request(app).options('/api/admin/analytics').set('Origin', 'http://localhost:3000')
    .set('Access-Control-Request-Headers', 'x-chatwoot-token').expect(204);
  expect(pre.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  expect(pre.headers['access-control-allow-headers']).toBe('X-Chatwoot-Token');
  const r = await get('admin-t').set('Origin', 'http://localhost:3000').expect(200);
  expect(r.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  const evil = await get('admin-t').set('Origin', 'http://evil.test').expect(200);
  expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  const elsewhere = await request(app).get('/healthz').set('Origin', 'http://localhost:3000');
  expect(elsewhere.headers['access-control-allow-origin']).toBeUndefined();
});

test('metrics over the window', async () => {
  const d1 = '2026-09-01T10:00:00Z', d2 = '2026-09-02T10:00:00Z';
  await Ticket.collection.insertMany([
    // AI-resolved, auto, fast, CSAT 5
    ticket(at(d1), { status: 'resolved', resolutionType: 'ai', resolvedAt: at(d1, 1), category: 'Billing',
      sla: { responseDueAt: at(d1, 4), resolutionDueAt: at(d1, 24), firstResponseAt: at(d1, 0.5), breachedAt: null },
      ai: { tier: 'auto', intent: 'refund_status', confidence: 0.9, triggers: [] }, csat: { rating: 5 } }),
    // human-resolved late, breached, triggers, CSAT 2
    ticket(at(d1), { status: 'resolved', resolutionType: 'human', resolvedAt: at(d1, 30), category: 'Billing',
      sla: { responseDueAt: at(d1, 4), resolutionDueAt: at(d1, 24), firstResponseAt: at(d1, 6), breachedAt: at(d1, 4) },
      ai: { tier: 'human', intent: 'payment_dispute', confidence: 0.3, triggers: ['payment_dispute', 'angry_customer'] }, csat: { rating: 2 } }),
    // draft, open, responded in time
    ticket(at(d2), { category: 'Technical', sla: { responseDueAt: at(d2, 4), resolutionDueAt: at(d2, 24), firstResponseAt: at(d2, 2), breachedAt: null },
      ai: { tier: 'draft', intent: 'refund_status', confidence: 0.7, triggers: ['payment_dispute'] } }),
    // outside the window
    ticket(at('2026-08-01T00:00:00Z'), { ai: { tier: 'auto', confidence: 0.1, triggers: ['fraud'] } }),
  ]);
  await AssistantFeedback.create([
    { userId: new mongoose.Types.ObjectId(), hash: 'a', excerpt: 'x', helpful: true },
    { userId: new mongoose.Types.ObjectId(), hash: 'b', excerpt: 'x', helpful: true },
    { userId: new mongoose.Types.ObjectId(), hash: 'c', excerpt: 'x', helpful: false },
  ]);
  await AssistantFeedback.collection.updateMany({}, { $set: { createdAt: at(d2) } });

  const r = (await get('admin-t', '?from=2026-09-01&to=2026-09-02').expect(200)).body;
  expect(r.range).toEqual({ from: '2026-09-01T00:00:00.000Z', to: '2026-09-03T00:00:00.000Z' });
  expect(r.totals).toEqual({ tickets: 3, aiResolved: 1, deflectionRate: 33.3 });
  expect(r.ticketsPerDay).toEqual([{ date: '2026-09-01', count: 2 }, { date: '2026-09-02', count: 1 }]);
  expect(r.tiers).toEqual({ auto: 1, draft: 1, human: 1, none: 0 });
  expect(r.escalationTriggers).toEqual([{ key: 'payment_dispute', count: 2 }, { key: 'angry_customer', count: 1 }]);
  expect(r.sla).toEqual({ responded: 3, firstResponseCompliance: 66.7, resolved: 2, resolutionCompliance: 50, breaches: 1,
    medianFirstResponseMinutes: 120, medianResolutionMinutes: expect.any(Number) });
  expect([60, 1800]).toContain(r.sla.medianResolutionMinutes);   // approximate median of two values picks one of them
  expect(r.csat.all).toMatchObject({ count: 2, average: 3.5 });
  expect(r.csat.all.distribution.map((x) => x.count)).toEqual([0, 1, 0, 0, 1]);
  expect(r.csat.ai).toMatchObject({ count: 1, average: 5 });
  expect(r.csat.human).toMatchObject({ count: 1, average: 2 });
  expect(r.topCategories).toEqual([{ key: 'Billing', count: 2 }, { key: 'Technical', count: 1 }]);
  expect(r.topIntents).toEqual([{ key: 'refund_status', count: 2 }, { key: 'payment_dispute', count: 1 }]);
  expect(r.kbGaps.count).toBe(1);
  expect(r.kbGaps.items[0]).toMatchObject({ intent: 'payment_dispute', confidence: 0.3 });
  expect(r.assistantFeedback).toEqual({ up: 2, down: 1, helpfulRate: 66.7 });
});

test('defaults to the last 30 days; empty data gives nulls not NaN; bad dates → 400', async () => {
  const r = (await get('admin-t').expect(200)).body;
  expect(new Date(r.range.to) - new Date(r.range.from)).toBe(30 * 24 * H);
  expect(r.totals).toEqual({ tickets: 0, aiResolved: 0, deflectionRate: null });
  expect(r.sla.firstResponseCompliance).toBeNull();
  expect(r.csat.all.average).toBeNull();
  await get('admin-t', '?from=yesterday').expect(400);
  await get('admin-t', '?from=2026-09-05&to=2026-09-01').expect(400);
});

test('Chatwoot down → 502', async () => {
  globalThis.fetch.mockImplementation(async () => { throw new Error('ECONNREFUSED'); });
  expect((await get('admin-t').expect(502)).body.error.code).toBe('CHATWOOT_UNAVAILABLE');
});
