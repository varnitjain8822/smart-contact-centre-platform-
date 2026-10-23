import { createHash } from 'node:crypto';
import { deps } from '../deps.js';
import { log } from '../lib/log.js';
import { KbArticle } from '../models/KbArticle.js';
import { KbChunk } from '../models/KbChunk.js';
import { KbTranslation } from '../models/KbTranslation.js';

/** Chunks: title + keywords, then title + each paragraph (articles are a few short paragraphs). */
export const chunksOf = (a) => [`${a.title}. ${(a.keywords ?? []).join(', ')}`,
  ...a.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `${a.title}. ${p}`)];

let cache = null;
// ponytail: all vectors in memory (~25 docs × 4 chunks × 384 floats); move to Atlas/pgvector search past a few thousand chunks
export const chunkVectors = () => (cache ??= KbChunk.find({}, 'slug locale vector').lean().catch((e) => { cache = null; throw e; }));

/** Embed every article/translation whose content hash changed (or that has no chunks). Returns the number re-embedded. */
export async function reindex() {
  const e = deps.embedder;
  if (!e) return 0;
  const docs = [...(await KbArticle.find({}, 'slug title body keywords').lean()).map((a) => ({ ...a, locale: 'en' })),
    ...await KbTranslation.find({}, 'slug locale title body keywords').lean()];
  let n = 0;
  for (const d of docs) {
    const texts = chunksOf(d);
    const hash = createHash('sha256').update(JSON.stringify([e.model, texts])).digest('hex');
    if ((await KbChunk.findOne({ slug: d.slug, locale: d.locale }, 'hash').lean())?.hash === hash) continue;
    const vectors = await e.embed(texts, 'passage');
    await KbChunk.deleteMany({ slug: d.slug, locale: d.locale });
    await KbChunk.insertMany(texts.map((text, i) => ({ slug: d.slug, locale: d.locale, hash, i, text, vector: vectors[i] })));
    n++;
  }
  cache = null;
  if (n) log.info({ evt: 'kb_embedded', docs: n, model: e.model });
  return n;
}
