import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { CATEGORIES } from '../../src/constants.js';
import { topArticles } from '../../src/kb/retrieve.js';
import { KbArticle } from '../../src/models/KbArticle.js';
import { ARTICLES, upsertArticles } from '../../src/seed/kb.js';
import { setup, signUp } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, groq, a;
beforeAll(async () => { await startDb(); ({ app, groq } = await setup()); a = await signUp(app); });
afterAll(stopDb);
beforeEach(() => { groq.fail = null; groq.out = null; });

test('seed: ≥10 articles across 6 categories, idempotent upsert', async () => {
  expect(ARTICLES.length).toBeGreaterThanOrEqual(10);
  expect(new Set(ARTICLES.map((x) => x.category)).size).toBeGreaterThanOrEqual(6);
  for (const c of CATEGORIES.slice(0, 6)) expect(ARTICLES.some((x) => x.category === c)).toBe(true);
  await upsertArticles();
  expect(await KbArticle.countDocuments()).toBe(ARTICLES.length);
  expect((await topArticles('payment deducted plan inactive', 3))[0].slug).toBe('payment-pending-subscription-not-active');
});

test('E16 search/category, E17 article/404', async () => {
  const r = await request(app).get('/api/kb/articles?q=invoice').expect(200);
  expect(r.body.items[0].slug).toBe('invoice-gst-receipt-download');
  expect(Object.keys(r.body.items[0]).sort()).toEqual(['category', 'excerpt', 'slug', 'title', 'updatedAt']);
  expect(r.body.items[0].excerpt.length).toBeLessThanOrEqual(160);
  const c = await request(app).get('/api/kb/articles?category=Account').expect(200);
  expect(c.body.items.length).toBe(3);
  expect(c.body.items.every((x) => x.category === 'Account')).toBe(true);
  expect((await request(app).get('/api/kb/articles?q=invoice&category=Account').expect(200)).body.items).toEqual([]);
  expect((await request(app).get('/api/kb/articles').expect(200)).body.items).toHaveLength(ARTICLES.length);
  await request(app).get('/api/kb/articles?category=Nope').expect(400);
  const art = await request(app).get('/api/kb/articles/refund-status').expect(200);
  expect(art.body.article.body).toMatch(/5–7 business days/);
  expect((await request(app).get('/api/kb/articles/nope').expect(404)).body.error.code).toBe('NOT_FOUND');
});

test('topArticles(query, 3) returns ≤3 sorted by textScore', async () => {
  const hits = await topArticles('payment billing invoice refund login password', 3);
  expect(hits.length).toBe(3);
  expect(hits.map((h) => h.score)).toEqual([...hits.map((h) => h.score)].sort((x, y) => y - x));
});

const SLUG = 'payment-pending-subscription-not-active';
const body = { subject: 'Payment deducted', description: 'I paid yesterday and my plan is still inactive.' };
const out = (o = {}) => ({ intent: 'x', category: 'Billing', priority: 'low', confidence: 0.8, triggers: [], answer: 'Wait 30 minutes.', sources: [SLUG], summary: '', ...o });

test('E18 suggest: answer only when conf ≥0.6, no triggers, ≥1 valid source', async () => {
  groq.out = out();
  const r = await a.post('/api/ai/suggest').send(body).expect(200);
  expect(r.body).toMatchObject({ answer: 'Wait 30 minutes.', confidence: 0.8, sources: [{ slug: SLUG, title: 'Payment Pending / Subscription Not Active' }] });
  expect(r.body.articles[0].slug).toBe(SLUG);
  groq.out = out({ confidence: 0.59 });
  expect((await a.post('/api/ai/suggest').send(body).expect(200)).body).toMatchObject({ answer: null, confidence: 0.59 });
  groq.out = out({ triggers: ['legal'] });
  expect((await a.post('/api/ai/suggest').send(body).expect(200)).body.answer).toBeNull();
  groq.out = out();
  expect((await a.post('/api/ai/suggest').send({ ...body, description: 'This is a scam, I paid and plan inactive' }).expect(200)).body.answer).toBeNull();
  groq.out = out({ sources: ['invented'] });
  expect((await a.post('/api/ai/suggest').send(body).expect(200)).body.answer).toBeNull();
});

test('E18 LLM failure → answer null + articles; 21st call/min → 429; auth required', async () => {
  groq.fail = new Error('boom');
  const r = await a.post('/api/ai/suggest').send(body).expect(200);
  expect(r.body).toMatchObject({ answer: null, confidence: null, sources: [] });
  expect(r.body.articles.length).toBeGreaterThan(0);
  await request(app).post('/api/ai/suggest').send(body).expect(401);
  await a.post('/api/ai/suggest').send({ subject: '', description: 'short' }).expect(400);
  const b = await signUp(app, 'Limit Tester');
  for (let i = 0; i < 20; i++) await b.post('/api/ai/suggest').send(body).expect(200);
  expect((await b.post('/api/ai/suggest').send(body).expect(429)).body.error.code).toBe('RATE_LIMITED');
});
