import { Router } from 'express';
import { z } from 'zod';
import { cfg } from '../config.js';
import { AppError } from '../lib/errors.js';
import { AssistantFeedback } from '../models/Feedback.js';
import { Ticket } from '../models/Ticket.js';

// Admin analytics for the Chatwoot "SmartCC Analytics" report page. The caller is a Chatwoot user: auth is their
// Chatwoot access_token (X-Chatwoot-Token), checked against Chatwoot /api/v1/profile and required to be an administrator.
export const adminRouter = Router();
const ORIGIN = process.env.CHATWOOT_PUBLIC_ORIGIN || `http://localhost:${process.env.CW_PORT || 3000}`;
const DAY = 86_400_000;

// CORS for the Chatwoot dashboard origin only (this router only)
adminRouter.use((req, res, next) => {
  if (req.headers.origin === ORIGIN) {
    res.set({ 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': 'X-Chatwoot-Token', 'Access-Control-Max-Age': '600' });
  }
  res.vary('Origin');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const profiles = new Map();   // token → {at, admin}; ponytail: unbounded, fine for a handful of admins
export const clearProfileCache = () => profiles.clear();

async function isAdmin(token) {
  const hit = profiles.get(token);
  if (hit && Date.now() - hit.at < 60_000) return hit.admin;
  const res = await fetch(`${cfg.CHATWOOT_URL}/api/v1/profile`, { headers: { api_access_token: token },
    signal: AbortSignal.timeout(cfg.CHATWOOT_TIMEOUT_MS) }).catch(() => null);
  if (!res || res.status >= 500) throw new AppError(502, 'CHATWOOT_UNAVAILABLE', 'Could not verify the Chatwoot session');
  const profile = res.ok ? await res.json() : null;
  const admin = !!profile?.accounts?.some((a) => String(a.id) === String(cfg.CHATWOOT_ACCOUNT_ID) && a.role === 'administrator');
  profiles.set(token, { at: Date.now(), admin });
  return admin;
}

adminRouter.use(async (req, res, next) => {
  const token = req.get('X-Chatwoot-Token');
  if (!token) return next(new AppError(401, 'UNAUTHENTICATED', 'X-Chatwoot-Token required'));
  if (!(await isAdmin(token))) return next(new AppError(403, 'FORBIDDEN', 'Chatwoot administrator role required'));
  next();
});

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
adminRouter.get('/analytics', async (req, res) => {
  const q = z.object({ from: day, to: day }).parse(req.query);
  const to = q.to ? new Date(`${q.to}T00:00:00Z`).getTime() + DAY : Date.now();   // `to` is inclusive
  const from = q.from ? new Date(`${q.from}T00:00:00Z`).getTime() : to - 30 * DAY;
  if (!(from < to)) throw new AppError(400, 'VALIDATION_FAILED', 'from must be before to');
  res.json(await analytics(new Date(from), new Date(to)));
});

const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);
const minutes = (ms) => (ms == null ? null : Math.round(ms / 6000) / 10);
const counts = (rows) => rows.map((r) => ({ key: r._id, count: r.count }));

export async function analytics(from, to) {
  const [f] = await Ticket.aggregate([
    { $match: { createdAt: { $gte: from, $lt: to } } },
    { $facet: {
      total: [{ $count: 'n' }],
      perDay: [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
      tiers: [{ $group: { _id: { $ifNull: ['$ai.tier', 'none'] }, count: { $sum: 1 } } }],
      aiResolved: [{ $match: { resolutionType: 'ai' } }, { $count: 'n' }],
      triggers: [{ $unwind: '$ai.triggers' }, { $group: { _id: '$ai.triggers', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
      sla: [{ $group: { _id: null,
        responded: { $sum: { $cond: [{ $ifNull: ['$sla.firstResponseAt', false] }, 1, 0] } },
        respondedInTime: { $sum: { $cond: [{ $and: [{ $ifNull: ['$sla.firstResponseAt', false] },
          { $lte: ['$sla.firstResponseAt', '$sla.responseDueAt'] }] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $ifNull: ['$resolvedAt', false] }, 1, 0] } },
        resolvedInTime: { $sum: { $cond: [{ $and: [{ $ifNull: ['$resolvedAt', false] }, { $lte: ['$resolvedAt', '$sla.resolutionDueAt'] }] }, 1, 0] } },
        breaches: { $sum: { $cond: [{ $ifNull: ['$sla.breachedAt', false] }, 1, 0] } },
        medianFirstResponseMs: { $median: { method: 'approximate',
          input: { $cond: [{ $ifNull: ['$sla.firstResponseAt', false] }, { $subtract: ['$sla.firstResponseAt', '$createdAt'] }, null] } } },
        medianResolutionMs: { $median: { method: 'approximate',
          input: { $cond: [{ $ifNull: ['$resolvedAt', false] }, { $subtract: ['$resolvedAt', '$createdAt'] }, null] } } },
      } }],
      csat: [{ $match: { 'csat.rating': { $ne: null } } },
        { $group: { _id: { by: { $ifNull: ['$resolutionType', 'human'] }, rating: '$csat.rating' }, count: { $sum: 1 } } }],
      categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 10 }],
      intents: [{ $match: { 'ai.intent': { $nin: [null, '', 'unknown'] } } }, { $group: { _id: '$ai.intent', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } }, { $limit: 10 }],
      // KB gaps: the AI ran but was not confident enough to even draft
      gaps: [{ $match: { 'ai.confidence': { $ne: null, $lt: cfg.AI_DRAFT_THRESHOLD } } }, { $sort: { createdAt: -1 } },
        { $group: { _id: null, count: { $sum: 1 }, items: { $push: { number: '$number', subject: '$subject', intent: '$ai.intent',
          category: '$category', confidence: '$ai.confidence', createdAt: '$createdAt' } } } },
        { $project: { count: 1, items: { $slice: ['$items', 20] } } }],
    } },
  ]);
  const fb = await AssistantFeedback.aggregate([{ $match: { createdAt: { $gte: from, $lt: to } } },
    { $group: { _id: '$helpful', count: { $sum: 1 } } }]);

  const total = f.total[0]?.n ?? 0;
  const s = f.sla[0] ?? {};
  const csatGroup = (by) => {
    const rows = f.csat.filter((r) => !by || r._id.by === by);
    const n = rows.reduce((a, r) => a + r.count, 0);
    return { count: n, average: n ? Math.round((rows.reduce((a, r) => a + r._id.rating * r.count, 0) / n) * 100) / 100 : null,
      distribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: rows.filter((r) => r._id.rating === rating).reduce((a, r) => a + r.count, 0) })) };
  };
  const tier = (k) => f.tiers.find((r) => r._id === k)?.count ?? 0;
  const up = fb.find((r) => r._id === true)?.count ?? 0;
  const down = fb.find((r) => r._id === false)?.count ?? 0;
  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: { tickets: total, aiResolved: f.aiResolved[0]?.n ?? 0, deflectionRate: pct(f.aiResolved[0]?.n ?? 0, total) },
    ticketsPerDay: f.perDay.map((r) => ({ date: r._id, count: r.count })),
    tiers: { auto: tier('auto'), draft: tier('draft'), human: tier('human'), none: tier('none') },
    escalationTriggers: counts(f.triggers),
    sla: { responded: s.responded ?? 0, firstResponseCompliance: pct(s.respondedInTime ?? 0, s.responded ?? 0),
      resolved: s.resolved ?? 0, resolutionCompliance: pct(s.resolvedInTime ?? 0, s.resolved ?? 0), breaches: s.breaches ?? 0,
      medianFirstResponseMinutes: minutes(s.medianFirstResponseMs), medianResolutionMinutes: minutes(s.medianResolutionMs) },
    csat: { all: csatGroup(), ai: csatGroup('ai'), human: csatGroup('human') },
    topCategories: counts(f.categories),
    topIntents: counts(f.intents),
    kbGaps: { count: f.gaps[0]?.count ?? 0, items: f.gaps[0]?.items ?? [] },
    assistantFeedback: { up, down, helpfulRate: pct(up, up + down) },
  };
}
