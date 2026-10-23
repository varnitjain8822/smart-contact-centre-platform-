// npm run eval — real embedding model (downloaded once into the transformers cache). Not part of `npm test`.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, test } from 'vitest';
import * as embedder from '../../src/kb/embed.js';
import { deps } from '../../src/deps.js';
import { searchArticles } from '../../src/kb/retrieve.js';
import { reindex } from '../../src/kb/vectors.js';
import { upsertArticles } from '../../src/seed/kb.js';
import { startDb, stopDb } from '../db.js';

const CASES = JSON.parse(readFileSync(new URL('./kb-retrieval.json', import.meta.url), 'utf8'));

async function recall(k = 3) {
  const misses = [];
  for (const c of CASES) {
    const top = (await searchArticles(c.q, { locale: c.locale, limit: k })).map((a) => a.slug);
    if (!top.includes(c.slug)) misses.push(`${c.locale} "${c.q}" → [${top.join(', ')}] (want ${c.slug})`);
  }
  return { recall: (CASES.length - misses.length) / CASES.length, misses };
}

beforeAll(async () => {
  await startDb();
  await upsertArticles();
  deps.embedder = embedder;
  await reindex();
}, 600_000);
afterAll(stopDb);

test(`hybrid top-3 recall ≥ 0.9 and ≥ text-only (${CASES.length} en+hi questions)`, async () => {
  expect(CASES.length).toBeGreaterThanOrEqual(40);
  deps.embedder = null;
  const [text, text1] = [await recall(), await recall(1)];
  deps.embedder = embedder;
  const [hybrid, hybrid1] = [await recall(), await recall(1)];
  console.log(`KB retrieval (n=${CASES.length}) top-3 recall: text-only ${text.recall.toFixed(3)} · hybrid ${hybrid.recall.toFixed(3)}`
    + ` | top-1: text-only ${text1.recall.toFixed(3)} · hybrid ${hybrid1.recall.toFixed(3)}`);
  console.log(`hybrid misses:\n  ${hybrid.misses.join('\n  ') || '(none)'}`);
  expect(hybrid.recall).toBeGreaterThanOrEqual(0.9);
  expect(hybrid.recall).toBeGreaterThanOrEqual(text.recall);
}, 600_000);
