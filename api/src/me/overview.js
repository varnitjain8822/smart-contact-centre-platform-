import { localize } from '../kb/retrieve.js';
import { KbArticle } from '../models/KbArticle.js';
import { Message } from '../models/Message.js';
import { Ticket } from '../models/Ticket.js';
import * as sla from '../sla/sla.js';

const TTL_MS = 30_000;
const cache = new Map();   // userId -> {at, value}; ponytail: per-process, fine for one api instance
export const clearOverviewCache = () => cache.clear();
const iso = (d) => new Date(d).toISOString();
const round = (n, dp) => (n == null ? null : Math.round(n * 10 ** dp) / 10 ** dp);

/** Cached 30 s per user, but any change to one of the user's tickets (updatedAt) refreshes it at once. */
export async function overview(user, now = new Date()) {
  const key = String(user._id);
  const hit = cache.get(key);
  const latest = await Ticket.findOne({ customerId: user._id }, { updatedAt: 1 }).sort({ updatedAt: -1 }).lean();
  const stamp = latest?.updatedAt?.getTime() ?? 0;
  if (hit && hit.stamp === stamp && now - hit.at < TTL_MS) return hit.value;
  const value = await compute(user, now);
  cache.set(key, { at: now.getTime(), stamp, value });
  return value;
}

async function compute(user, now) {
  const since30d = new Date(now - 30 * 86400_000);
  const [agg = {}] = await Ticket.aggregate([
    { $match: { customerId: user._id } },
    { $group: { _id: null,
      open: { $sum: { $cond: [{ $ne: ['$status', 'resolved'] }, 1, 0] } },
      aiHandling: { $sum: { $cond: [{ $eq: ['$status', 'ai_handling'] }, 1, 0] } },
      waitingOnYou: { $sum: { $cond: [{ $or: [{ $eq: ['$status', 'waiting_on_customer'] },
        { $and: [{ $eq: ['$status', 'ai_handling'] }, { $eq: ['$ai.awaitingAcceptance', true] }] }] }, 1, 0] } },
      resolved30d: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'resolved'] }, { $gte: ['$resolvedAt', since30d] }] }, 1, 0] } },
      firstResponseMs: { $avg: { $cond: [{ $gt: ['$sla.firstResponseAt', null] }, { $subtract: ['$sla.firstResponseAt', '$createdAt'] }, null] } },
      resolutionMs: { $avg: { $cond: [{ $and: [{ $eq: ['$status', 'resolved'] }, { $gt: ['$resolvedAt', null] }] }, { $subtract: ['$resolvedAt', '$createdAt'] }, null] } },
      csatAvg: { $avg: '$csat.rating' } } },
  ]);

  // ponytail: loads the customer's 200 most recent tickets; an index-backed $facet when customers hold thousands
  const tickets = await Ticket.find({ customerId: user._id }, 'number status priority createdAt resolvedAt sla statusHistory csat ai')
    .sort({ updatedAt: -1 }).limit(200).lean();
  const byId = new Map(tickets.map((t) => [String(t._id), t]));

  const slaWatch = tickets.filter((t) => t.status !== 'resolved')
    .map((t) => ({ number: t.number, dueAt: sla.activeDue(t), state: sla.state(t, now) }))
    .filter((x) => x.state === 'at_risk' || x.state === 'breached')
    .sort((a, b) => a.dueAt - b.dueAt).slice(0, 5)
    .map((x) => ({ ...x, dueAt: iso(x.dueAt) }));

  const replies = await Message.find({ ticketId: { $in: tickets.map((t) => t._id) }, author: { $in: ['agent', 'ai'] } }, 'ticketId author body createdAt')
    .sort({ createdAt: -1 }).limit(10).lean();
  const activity = [
    ...replies.map((m) => ({ type: m.author === 'agent' ? 'agent_reply' : 'ai_answer', ticket: byId.get(String(m.ticketId)).number,
      at: m.createdAt, text: m.body.slice(0, 140) })),
    ...tickets.flatMap((t) => (t.statusHistory ?? []).slice(1).map((h) => ({ type: 'status', ticket: t.number, at: h.at, text: h.status }))),
    ...tickets.filter((t) => t.csat?.submittedAt).map((t) => ({ type: 'csat', ticket: t.number, at: t.csat.submittedAt, text: `${t.csat.rating}/5` })),
  ].sort((a, b) => b.at - a.at).slice(0, 10).map((x) => ({ ...x, at: iso(x.at) }));

  const popular = await localize(await KbArticle.find({}, 'slug title views').sort({ views: -1, slug: 1 }).limit(5).lean(), user.locale ?? 'en');

  return {
    counts: { open: agg.open ?? 0, aiHandling: agg.aiHandling ?? 0, waitingOnYou: agg.waitingOnYou ?? 0, resolved30d: agg.resolved30d ?? 0 },
    avgFirstResponseMin: agg.firstResponseMs == null ? null : Math.round(agg.firstResponseMs / 60_000),
    avgResolutionHrs: round(agg.resolutionMs == null ? null : agg.resolutionMs / 3600_000, 1),
    csatAvg: round(agg.csatAvg, 1),
    slaWatch,
    activity,
    popularArticles: popular.map((a) => ({ slug: a.slug, title: a.title, views: a.views ?? 0 })),
  };
}
