import { afterAll, beforeAll, expect, test } from 'vitest';
import { Ticket } from '../../src/models/Ticket.js';
import { newTicket, setup, signUp } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, a, n;   // n: ticket numbers by key
beforeAll(async () => {
  await startDb(); ({ app } = await setup()); a = await signUp(app);
  const spec = {
    gst: { subject: 'GST invoice mismatch', description: 'My GSTIN shows inactive on the invoice download page.', category: 'Compliance & GST' },
    pay: { subject: 'Payment deducted twice', description: 'UPI payment went through but plan still inactive today.', category: 'Billing' },
    ship: { subject: 'Shipment stuck at hub', description: 'AWB 12345 has not moved from the logistics hub for days.', category: 'Logistics & Orders' },
    login: { subject: 'Cannot sign in at all', description: 'Password reset email never arrives in my inbox at all.', category: 'Account' },
  };
  n = {};
  for (const [k, body] of Object.entries(spec)) n[k] = (await newTicket(a, body).expect(201)).body.ticket.number;
  const day = (d) => new Date(`2026-10-${d}T10:00:00Z`);
  const set = (k, $set) => Ticket.collection.updateOne({ number: n[k] }, { $set });
  await set('gst', { createdAt: day('01'), updatedAt: day('20'), priority: 'high' });
  await set('pay', { createdAt: day('05'), updatedAt: day('06'), priority: 'critical', status: 'in_progress', 'sla.responseDueAt': day('30'), 'sla.resolutionDueAt': day('31') });
  await set('ship', { createdAt: day('10'), updatedAt: day('15'), priority: 'low', status: 'resolved', resolvedAt: day('15') });
  await set('login', { createdAt: day('12'), updatedAt: day('12'), priority: 'medium', 'sla.firstResponseAt': day('12'), 'sla.responseDueAt': day('13'), 'sla.resolutionDueAt': day('14') });
});
afterAll(stopDb);

const nums = (r) => r.body.items.map((t) => t.number);
const get = (qs) => a.get(`/api/tickets?${qs}`).expect(200);

test('q: text search over subject/description; ticket number exact (with or without SC-)', async () => {
  expect(nums(await get('scope=all&q=gstin'))).toEqual([n.gst]);
  expect(nums(await get('scope=all&q=logistics'))).toEqual([n.ship]);
  expect(nums(await get(`scope=all&q=${n.pay}`))).toEqual([n.pay]);
  expect(nums(await get(`scope=all&q=${n.pay.slice(3)}`))).toEqual([n.pay]);
  expect(nums(await get('scope=all&q=zebra'))).toEqual([]);
});

test('status[] / category[] / priority[] in all three syntaxes; status overrides scope', async () => {
  expect(nums(await get('status=resolved'))).toEqual([n.ship]);   // default scope=open ignored
  expect(new Set(nums(await get('status[]=in_progress&status[]=resolved')))).toEqual(new Set([n.pay, n.ship]));
  expect(new Set(nums(await get('scope=all&category=Billing,Account')))).toEqual(new Set([n.pay, n.login]));
  expect(nums(await get('scope=all&priority=critical&priority=low&sort=priority'))).toEqual([n.pay, n.ship]);
  expect((await a.get('/api/tickets?status=nope').expect(400)).body.error.code).toBe('VALIDATION_FAILED');
});

test('from/to on createdAt; a date-only `to` includes that day', async () => {
  expect(new Set(nums(await get('scope=all&from=2026-10-05&to=2026-10-10')))).toEqual(new Set([n.pay, n.ship]));
  expect(nums(await get('scope=all&from=2026-10-11T00:00:00Z'))).toEqual([n.login]);
  await a.get('/api/tickets?from=yesterday').expect(400);
});

test('sort=updated|created|priority|sla', async () => {
  expect(nums(await get('scope=all&sort=updated'))).toEqual([n.gst, n.ship, n.login, n.pay]);
  expect(nums(await get('scope=all&sort=created'))).toEqual([n.login, n.ship, n.pay, n.gst]);
  expect(nums(await get('scope=all&sort=priority'))).toEqual([n.pay, n.gst, n.login, n.ship]);
  // sla: soonest active due first (login 14th via resolutionDue, pay 30th via responseDue), resolved last
  const sla = nums(await get('scope=all&sort=sla'));
  expect(sla.indexOf(n.login)).toBeLessThan(sla.indexOf(n.pay));
  expect(sla.at(-1)).toBe(n.ship);
  await a.get('/api/tickets?sort=random').expect(400);
});

test('cursor paging works for every sort and is opaque per sort', async () => {
  for (const sort of ['updated', 'created', 'priority', 'sla']) {
    const all = nums(await get(`scope=all&sort=${sort}`));
    const seen = [];
    let cursor = null;
    do {
      const r = await get(`scope=all&sort=${sort}&limit=1${cursor ? `&before=${encodeURIComponent(cursor)}` : ''}`);
      seen.push(...nums(r)); cursor = r.body.nextCursor;
    } while (cursor);
    expect(seen).toEqual(all);
  }
  const p1 = await get('scope=all&sort=updated&limit=1');
  expect(p1.body.nextCursor).toMatch(/^2026-10-20T10:00:00\.000Z_[a-f0-9]{24}$/);   // original format kept for sort=updated
  expect((await a.get('/api/tickets?sort=priority&before=notanumber_0123456789abcdef01234567').expect(400)).body.error.message).toBe('Invalid cursor');
});
