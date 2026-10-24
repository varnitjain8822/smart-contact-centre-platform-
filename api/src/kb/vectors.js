import { createHash } from 'node:crypto';
import { deps } from '../deps.js';
import { defaultCompanyId } from '../lib/company.js';
import { log } from '../lib/log.js';
import { KbArticle } from '../models/KbArticle.js';
import { KbChunk } from '../models/KbChunk.js';
import { KbTranslation } from '../models/KbTranslation.js';

/** Chunks: title + keywords, then title + each paragraph (articles are a few short paragraphs). */
export const chunksOf = (a) => [`${a.title}. ${(a.keywords ?? []).join(', ')}`,
  ...a.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `${a.title}. ${p}`)];

const cache = new Map();   // companyId → {at, p: Promise<chunks>}
const TTL_MS = 60_000;     // `npm run seed:companies` re-embeds in another process: pick its chunks up within a minute
// ponytail: all of a company's vectors in memory (~20 docs × 2 locales × 5 chunks × 384 floats); Atlas/pgvector past a few thousand chunks
export async function chunkVectors(companyId) {
  const k = String(companyId ?? await defaultCompanyId());
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.p;
  const p = KbChunk.find({ companyId: k }, 'slug locale vector').lean().catch((e) => { cache.delete(k); throw e; });
  cache.set(k, { at: Date.now(), p });
  return p;
}

/** Embed every article/translation whose content hash changed (or that has no chunks); all companies, or one. Returns the number re-embedded. */
export async function reindex(companyId) {
  const e = deps.embedder;
  if (!e) return 0;
  const f = companyId ? { companyId } : {};
  const docs = [...(await KbArticle.find(f, 'companyId slug title body keywords').lean()).map((a) => ({ ...a, locale: 'en' })),
    ...await KbTranslation.find(f, 'companyId slug locale title body keywords').lean()];
  let n = 0;
  for (const d of docs) {
    const texts = chunksOf(d);
    const hash = createHash('sha256').update(JSON.stringify([e.model, texts])).digest('hex');
    const key = { companyId: d.companyId, slug: d.slug, locale: d.locale };
    if ((await KbChunk.findOne(key, 'hash').lean())?.hash === hash) continue;
    const vectors = await e.embed(texts, 'passage');
    await KbChunk.deleteMany(key);
    await KbChunk.insertMany(texts.map((text, i) => ({ ...key, hash, i, text, vector: vectors[i] })));
    n++;
  }
  cache.clear();
  if (n) log.info({ evt: 'kb_embedded', docs: n, model: e.model });
  return n;
}
