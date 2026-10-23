import { KbArticle } from '../models/KbArticle.js';
import { KbTranslation } from '../models/KbTranslation.js';

/** Present articles in `locale`; any article without a translation stays English. */
export async function localize(articles, locale = 'en') {
  if (locale === 'en' || !articles.length) return articles.map((a) => ({ ...a, locale: 'en' }));
  const tr = new Map((await KbTranslation.find({ slug: { $in: articles.map((a) => a.slug) }, locale }).lean()).map((t) => [t.slug, t]));
  return articles.map((a) => {
    const t = tr.get(a.slug);
    return t ? { ...a, title: t.title, body: t.body, keywords: t.keywords, locale } : { ...a, locale: 'en' };
  });
}

/**
 * Text search over English articles and, for a non-English locale, that locale's translations too; best score per slug wins.
 * Results are presented in `locale` (English fallback). `filter` applies to KbArticle fields (e.g. category).
 */
export async function searchArticles(query, { locale = 'en', limit = 3, filter = {} } = {}) {
  const q = String(query).slice(0, 500);
  if (!q.trim()) return [];
  const score = { score: { $meta: 'textScore' } };
  const en = await KbArticle.find({ ...filter, $text: { $search: q } }, score).sort(score).limit(limit).lean();
  if (locale === 'en') return localize(en, 'en');
  const hits = await KbTranslation.find({ locale, $text: { $search: q } }, { ...score, slug: 1 }).sort(score).limit(limit).lean();
  const best = new Map(en.map((a) => [a.slug, a.score]));
  for (const h of hits) best.set(h.slug, Math.max(best.get(h.slug) ?? 0, h.score));
  const missing = hits.map((h) => h.slug).filter((s) => !en.some((a) => a.slug === s));
  const docs = [...en, ...(missing.length ? await KbArticle.find({ ...filter, slug: { $in: missing } }).lean() : [])];
  const ranked = docs.map((a) => ({ ...a, score: best.get(a.slug) })).sort((x, y) => y.score - x.score).slice(0, limit);
  return localize(ranked, locale);
}

export const topArticles = (query, n = 3, locale = 'en') => searchArticles(query, { locale, limit: n });
