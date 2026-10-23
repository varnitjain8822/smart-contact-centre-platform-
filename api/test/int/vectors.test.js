import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { deps } from '../../src/deps.js';
import { HYBRID, searchArticles } from '../../src/kb/retrieve.js';
import { reindex } from '../../src/kb/vectors.js';
import { KbArticle } from '../../src/models/KbArticle.js';
import { KbChunk } from '../../src/models/KbChunk.js';
import { ARTICLES, ARTICLES_HI, upsertArticles } from '../../src/seed/kb.js';
import { fakeEmbedder } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

const saved = { ...HYBRID };
let e;
beforeAll(async () => { await startDb(); await upsertArticles(); });
afterAll(async () => { deps.embedder = null; Object.assign(HYBRID, saved); await stopDb(); });
beforeEach(() => { e = fakeEmbedder({ zorbled: 'refund' }); deps.embedder = e; HYBRID.MIN_COS = 0.3; });

test('reindex embeds every article + translation once, then only on content change', async () => {
  expect(await reindex()).toBe(ARTICLES.length + ARTICLES_HI.length);
  expect(await KbChunk.distinct('locale')).toEqual(['en', 'hi']);
  expect((await KbChunk.findOne({ slug: 'refund-status', locale: 'en', i: 0 })).vector).toHaveLength(64);
  expect(await reindex()).toBe(0);
  await KbArticle.updateOne({ slug: 'refund-status' }, { $set: { body: 'Refunds take 3 days.' } });
  expect(await reindex()).toBe(1);
  expect(await KbChunk.countDocuments({ slug: 'refund-status', locale: 'en' })).toBe(2);   // title+keywords, 1 paragraph
  await upsertArticles();
  expect(await reindex()).toBe(1);
});

test('hybrid finds an article by meaning when text search has no hit; text-only does not', async () => {
  await reindex();
  expect((await searchArticles('zorbled', { limit: 3 }))[0].slug).toBe('refund-status');
  deps.embedder = null;
  expect(await searchArticles('zorbled', { limit: 3 })).toEqual([]);
});

test('below MIN_COS without a text hit → excluded; category filter applies to vector hits; Hindi presented', async () => {
  await reindex();
  HYBRID.MIN_COS = 0.99;
  expect(await searchArticles('zorbled', { limit: 3 })).toEqual([]);
  HYBRID.MIN_COS = 0.3;
  expect(await searchArticles('zorbled', { limit: 3, filter: { category: 'Account' } })).not.toContainEqual(expect.objectContaining({ slug: 'refund-status' }));
  const hi = await searchArticles('zorbled', { limit: 1, locale: 'hi' });
  expect(hi[0]).toMatchObject({ slug: 'refund-status', locale: 'hi' });
});

test('embedder failure → text-only results, no throw', async () => {
  await reindex();
  e.fail = new Error('model gone');
  const r = await searchArticles('invoice', { limit: 3 });
  expect(r[0].slug).toBe('invoice-gst-receipt-download');
});
