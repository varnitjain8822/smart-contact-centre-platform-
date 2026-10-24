import { Router } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { AssistantFeedback } from '../models/Feedback.js';
import { requireUser, optionalUser } from '../auth/session.js';
import { limit } from '../lib/limit.js';
import { LOCALES } from '../constants.js';
import { chat } from './assistant.js';
import { suggest } from './suggest.js';

export const aiRouter = Router();

aiRouter.post('/suggest', requireUser, limit({ windowMs: 60_000, max: 20, key: (req) => String(req.user._id) }), async (req, res) => {
  const b = z.object({ subject: z.string().trim().max(120).default(''),
    description: z.string().trim().min(20, 'Description must be at least 20 characters').max(5000) }).parse(req.body);
  res.json(await suggest(req.user, b, req.user.locale));
});

export const assistantRouter = Router();

const chatBody = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) }).strict()).min(1).max(20)
    .refine((m) => m.at(-1)?.role === 'user', 'The last message must be from the user'),
  locale: z.enum(LOCALES).optional(),
});

assistantRouter.post('/chat', optionalUser, limit({ windowMs: 10 * 60_000, max: 30, key: (req) => (req.user?._id ? String(req.user._id) : req.ip) }), async (req, res) => {
  const b = chatBody.parse(req.body);
  await chat(req, res, { messages: b.messages, locale: b.locale ?? req.user?.locale ?? 'en' });
});

// 👍/👎 on an assistant answer, stored for review. helpful:null withdraws the vote. Chats themselves are still not stored.
const feedbackBody = z.object({
  answer: z.string().trim().min(1).max(8000),
  question: z.string().trim().max(4000).optional(),
  helpful: z.boolean().nullable(),
  sources: z.array(z.object({ slug: z.string().max(200), title: z.string().max(200) }).strict()).max(5).default([]),
}).strict();

assistantRouter.post('/feedback', requireUser, limit({ windowMs: 10 * 60_000, max: 60, key: (req) => String(req.user._id) }), async (req, res) => {
  const b = feedbackBody.parse(req.body);
  const key = { userId: req.user._id, hash: createHash('sha256').update(b.answer).digest('hex') };
  if (b.helpful === null) await AssistantFeedback.deleteOne(key);
  else {
    await AssistantFeedback.updateOne(key, { $set: { companyId: req.user.companyId, excerpt: b.answer.slice(0, 1000), question: b.question?.slice(0, 1000), helpful: b.helpful,
      sources: b.sources, locale: req.user.locale ?? 'en' } }, { upsert: true });
  }
  res.status(204).end();
});
