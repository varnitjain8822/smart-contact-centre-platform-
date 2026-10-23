import { Router } from 'express';
import { z } from 'zod';
import { CATEGORIES, LOCALES } from '../constants.js';
import { optionalUser, requireUser } from '../auth/session.js';
import { AppError } from '../lib/errors.js';
import { KbVote } from '../models/Feedback.js';
import { KbArticle } from '../models/KbArticle.js';
import { toKbArticle, toKbSummary } from '../tickets/dto.js';
import { localize, searchArticles } from './retrieve.js';

export const kbRouter = Router();
const locale = z.enum(LOCALES).catch('en');

kbRouter.get('/articles', async (req, res) => {
  const { q, category, locale: loc } = z.object({ q: z.string().trim().max(100).optional(), category: z.enum(CATEGORIES).optional(), locale }).parse(req.query);
  const filter = category ? { category } : {};
  const items = q
    ? await searchArticles(q, { locale: loc, limit: 20, filter })
    : await localize(await KbArticle.find(filter).sort({ category: 1, title: 1 }).limit(200).lean(), loc);
  res.json({ items: items.map(toKbSummary) });
});

async function votes(slug, user) {
  const [helpfulCount, notHelpfulCount, mine] = await Promise.all([KbVote.countDocuments({ slug, helpful: true }),
    KbVote.countDocuments({ slug, helpful: false }), user ? KbVote.findOne({ slug, userId: user._id }, 'helpful').lean() : null]);
  return { helpfulCount, notHelpfulCount, myVote: mine?.helpful ?? null };
}

// Counts a view on every fetch (KB is public; no per-user dedupe). Signed in → myVote.
kbRouter.get('/articles/:slug', optionalUser, async (req, res) => {
  const { locale: loc } = z.object({ locale }).parse(req.query);
  const a = await KbArticle.findOneAndUpdate({ slug: String(req.params.slug) }, { $inc: { views: 1 } }, { new: true, timestamps: false }).lean();
  if (!a) throw new AppError(404, 'NOT_FOUND', 'Article not found');
  res.json({ article: toKbArticle((await localize([a], loc))[0], await votes(a.slug, req.user)) });
});

// One vote per user per article; a new vote replaces the old one.
kbRouter.post('/articles/:slug/feedback', requireUser, async (req, res) => {
  const { helpful } = z.object({ helpful: z.boolean() }).strict().parse(req.body);
  const slug = String(req.params.slug);
  if (!(await KbArticle.exists({ slug }))) throw new AppError(404, 'NOT_FOUND', 'Article not found');
  await KbVote.updateOne({ userId: req.user._id, slug }, { $set: { helpful } }, { upsert: true });
  res.json({ feedback: await votes(slug, req.user) });
});
