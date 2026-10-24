import { KbArticle } from '../models/KbArticle.js';
import { KbTranslation } from '../models/KbTranslation.js';
import { deps } from '../deps.js';
import { defaultCompanyId } from '../lib/company.js';
import { log } from '../lib/log.js';
import { chunkVectors } from './vectors.js';

// v4: every query is scoped to one company (companyId; default company when omitted, as before v4).
const cid = async (companyId) => companyId ?? defaultCompanyId();

/** Present articles in `locale`; any article without a translation stays English. */
export async function localize(articles, locale = 'en', companyId = articles[0]?.companyId) {
  if (locale === 'en' || !articles.length) return articles.map((a) => ({ ...a, locale: 'en' }));
  const tr = new Map((await KbTranslation.find({ companyId: await cid(companyId), slug: { $in: articles.map((a) => a.slug) }, locale }).lean())
    .map((t) => [t.slug, t]));
  return articles.map((a) => {
    const t = tr.get(a.slug);
    return t ? { ...a, title: t.title, body: t.body, keywords: t.keywords, locale } : { ...a, locale: 'en' };
  });
}

/** Best textScore per slug: English articles and, for a non-English locale, that locale's translations (top n of each). */
async function textScores(q, locale, n, filter, companyId) {
  const score = { score: { $meta: 'textScore' } };
  const best = new Map((await KbArticle.find({ ...filter, companyId, $text: { $search: q } }, { ...score, slug: 1 }).sort(score).limit(n).lean())
    .map((a) => [a.slug, a.score]));
  if (locale !== 'en') {
    for (const h of await KbTranslation.find({ companyId, locale, $text: { $search: q } }, { ...score, slug: 1 }).sort(score).limit(n).lean()) {
      best.set(h.slug, Math.max(best.get(h.slug) ?? 0, h.score));
    }
  }
  return best;
}

// Hybrid ranking (tuned on test/eval/kb-retrieval.json): score = TEXT_WEIGHT · textScore/maxTextScore + cosine.
// An article enters on any text hit, or on cosine ≥ MIN_COS (e5 cosines sit around 0.75–0.9 even for unrelated text).
export const HYBRID = { TEXT_WEIGHT: 0.05, MIN_COS: 0.82 };

/** Best cosine per slug over the English chunks and the `locale` chunks; null when embeddings are off or failing. */
async function vectorScores(q, locale, companyId) {
  if (!deps.embedder) return null;
  try {
    const [qv] = await deps.embedder.embed([q], 'query');
    const best = new Map();
    for (const c of await chunkVectors(companyId)) {
      if (c.locale !== 'en' && c.locale !== locale) continue;
      let s = 0;
      for (let i = 0; i < qv.length; i++) s += qv[i] * c.vector[i];
      if (s > (best.get(c.slug) ?? -1)) best.set(c.slug, s);
    }
    return best.size ? best : null;   // nothing indexed yet → text only
  } catch (e) {
    log.warn({ evt: 'kb_vector_search_failed', err: e.message });
    return null;
  }
}

/**
 * Hybrid search (text + embeddings, lld-backend §11) over one company's English articles and the locale's translations; text-only
 * when embeddings are off. Results are presented in `locale` (English fallback). `filter` applies to KbArticle fields (e.g. category).
 */
export async function searchArticles(query, { locale = 'en', limit = 3, filter = {}, companyId } = {}) {
  const q = String(query).slice(0, 500);
  if (!q.trim()) return [];
  companyId = await cid(companyId);
  const vec = await vectorScores(q, locale, companyId);
  const text = await textScores(q, locale, vec ? 20 : limit, filter, companyId);
  let score = (slug) => text.get(slug);
  if (vec) {
    const maxT = Math.max(0, ...text.values()) || 1;
    for (const [slug, c] of vec) if (c < HYBRID.MIN_COS && !text.has(slug)) vec.delete(slug);
    score = (slug) => HYBRID.TEXT_WEIGHT * ((text.get(slug) ?? 0) / maxT) + (vec.get(slug) ?? 0);
  }
  const slugs = [...new Set([...text.keys(), ...(vec?.keys() ?? [])])];
  if (!slugs.length) return [];
  const docs = await KbArticle.find({ ...filter, companyId, slug: { $in: slugs } }).lean();
  const ranked = docs.map((a) => ({ ...a, score: score(a.slug) })).sort((x, y) => y.score - x.score).slice(0, limit);
  return localize(ranked, locale);
}

export const topArticles = (query, n = 3, locale = 'en', companyId = undefined) => searchArticles(query, { locale, limit: n, companyId });
