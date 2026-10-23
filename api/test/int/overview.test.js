import request from 'supertest';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { clearOverviewCache, overview } from '../../src/me/overview.js';
import { KbArticle } from '../../src/models/KbArticle.js';
import { Message } from '../../src/models/Message.js';
import { Ticket } from '../../src/models/Ticket.js';
import { User } from '../../src/models/User.js';
import { newTicket, setup, signUp } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, a;
beforeAll(async () => { await startDb(); ({ app } = await setup()); a = await signUp(app); });
afterAll(stopDb);

const H = 3600_000;

test('KB article GET increments views (not updatedAt)', async () => {
  const before = await KbArticle.findOne({ slug: 'refund-status' }).lean();
  const r = await request(app).get('/api/kb/articles/refund-status').expect(200);
  expect(r.body.article).toMatchObject({ slug: 'refund-status', views: 1, locale: 'en' });
  await request(app).get('/api/kb/articles/refund-status').expect(200);
  const after = await KbArticle.findOne({ slug: 'refund-status' }).lean();
  expect(after.views).toBe(2);
  expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
});

test('GET /api/me/overview: counts, averages, slaWatch, activity, popular; 30 s cache; auth', async () => {
  await request(app).get('/api/me/overview').expect(401);
  const empty = (await a.get('/api/me/overview').expect(200)).body;
  expect(empty).toMatchObject({ counts: { open: 0, aiHandling: 0, waitingOnYou: 0, resolved30d: 0 }, avgFirstResponseMin: null,
    avgResolutionHrs: null, csatAvg: null, slaWatch: [], activity: [] });
  expect(empty.popularArticles[0]).toEqual({ slug: 'refund-status', title: 'Refund Status & Reimbursement Timelines', views: 2 });

  const mk = async () => { const r = await newTicket(a).expect(201); return Ticket.findOne({ number: r.body.ticket.number }); };
  const [t1, t2, t3, t4] = [await mk(), await mk(), await mk(), await mk()];
  const now = Date.now();
  const created = new Date(now - 10 * H);
  // t1: resolved after 4 h, first response after 30 min, csat 4
  await Ticket.collection.updateOne({ _id: t1._id }, { $set: { createdAt: created, status: 'resolved', resolvedAt: new Date(created.getTime() + 4 * H),
    'sla.firstResponseAt': new Date(created.getTime() + 30 * 60_000), csat: { rating: 4, comment: '', submittedAt: new Date(now - 60_000) } },
  $push: { statusHistory: { status: 'resolved', at: new Date(now - 2 * H), by: 'agent' } } });
  // t2: waiting on customer; first response after 10 min
  await Ticket.collection.updateOne({ _id: t2._id }, { $set: { createdAt: created, status: 'waiting_on_customer', 'sla.firstResponseAt': new Date(created.getTime() + 10 * 60_000) },
    $push: { statusHistory: { status: 'waiting_on_customer', at: new Date(now - H), by: 'agent' } } });
  // t3: AI answered, awaiting acceptance; SLA breached
  await Ticket.updateOne({ _id: t3._id }, { $set: { 'ai.awaitingAcceptance': true, 'sla.responseDueAt': new Date(now - 60_000) } });
  await Message.create({ ticketId: t2._id, author: 'agent', authorName: 'Asha', body: 'Please send the invoice number.', createdAt: new Date(now - 30_000) });
  await Message.create({ ticketId: t3._id, author: 'ai', authorName: 'AI assistant', body: 'Wait 30 minutes.', createdAt: new Date(now - 20_000) });

  const fresh = (await a.get('/api/me/overview').expect(200)).body;
  expect(fresh.counts.open).toBe(3);   // new tickets bump updatedAt → the 30 s cache is bypassed (e2e: Home right after raising a ticket)
  clearOverviewCache();
  const o = (await a.get('/api/me/overview').expect(200)).body;
  expect(o.counts).toEqual({ open: 3, aiHandling: 2, waitingOnYou: 2, resolved30d: 1 });
  expect(o.avgFirstResponseMin).toBe(20);
  expect(o.avgResolutionHrs).toBe(4);
  expect(o.csatAvg).toBe(4);
  expect(o.slaWatch).toEqual([{ number: t3.number, dueAt: expect.any(String), state: 'breached' }]);
  expect(o.activity.slice(0, 3)).toEqual([
    { type: 'ai_answer', ticket: t3.number, at: expect.any(String), text: 'Wait 30 minutes.' },
    { type: 'agent_reply', ticket: t2.number, at: expect.any(String), text: 'Please send the invoice number.' },
    { type: 'csat', ticket: t1.number, at: expect.any(String), text: '4/5' },
  ]);
  expect(o.activity.map((x) => x.type)).toEqual(expect.arrayContaining(['status']));
  expect(o.activity.length).toBeLessThanOrEqual(10);
  expect(o.activity.every((x, i, arr) => i === 0 || arr[i - 1].at >= x.at)).toBe(true);
  void t4;

  // another user sees none of it; Hindi locale → Hindi article titles
  const b = await signUp(app, 'Ravi Kumar');
  await b.patch('/api/me').send({ locale: 'hi' }).expect(200);
  const ob = (await b.get('/api/me/overview').expect(200)).body;
  expect(ob.counts.open).toBe(0);
  expect(ob.popularArticles[0]).toMatchObject({ slug: 'refund-status', views: 2 });
  expect(ob.popularArticles[0].title).toMatch(/रिफ़ंड/);
});

test('overview() caches per user for 30 s', async () => {
  const u = await User.findOne();
  clearOverviewCache();
  const t0 = new Date();
  const first = await overview(u, t0);
  expect(await overview(u, new Date(t0.getTime() + 29_000))).toBe(first);
  expect(await overview(u, new Date(t0.getTime() + 31_000))).not.toBe(first);
  const second = await overview(u, new Date(t0.getTime() + 31_000));
  await Ticket.updateOne({ customerId: u._id }, { $set: { subject: 'Touched' } });   // mongoose bumps updatedAt
  expect(await overview(u, new Date(t0.getTime() + 32_000))).not.toBe(second);
});
