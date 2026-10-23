import * as sla from '../sla/sla.js';

const iso = (d) => (d ? new Date(d).toISOString() : null);

export const delivery = (t) => (t.chatwoot?.syncState === 'synced' ? 'synced' : (t.chatwoot?.attempts ?? 0) >= 20 ? 'delayed' : 'queued');

export const actions = (t) => ({
  canAccept: t.status === 'ai_handling' && !!t.ai?.awaitingAcceptance,
  canRequestHuman: t.status === 'ai_handling' && !t.ai?.humanRequested,
  canResolve: t.status !== 'resolved',
  canRate: t.status === 'resolved' && t.csat?.rating == null,
});

export function toTicketSummary(t, now = new Date()) {
  return {
    number: t.number, subject: t.subject, status: t.status, priority: t.priority, category: t.category,
    createdAt: iso(t.createdAt), updatedAt: iso(t.updatedAt), lastMessageAt: iso(t.lastMessageAt),
    sla: { responseDueAt: iso(t.sla.responseDueAt), resolutionDueAt: iso(t.sla.resolutionDueAt),
      firstResponseAt: iso(t.sla.firstResponseAt), resolvedAt: iso(t.resolvedAt),
      activeDueAt: t.status === 'resolved' ? null : iso(sla.activeDue(t)), state: sla.state(t, now) },
    aiTier: t.ai?.tier ?? null,
    delivery: delivery(t),
  };
}

export function toTicketDetail(t, now = new Date()) {
  return {
    ...toTicketSummary(t, now),
    description: t.description, customerCategory: t.customerCategory ?? null, resolutionType: t.resolutionType ?? null,
    csat: t.csat?.rating != null ? { rating: t.csat.rating, comment: t.csat.comment ?? '', submittedAt: iso(t.csat.submittedAt) } : null,
    statusHistory: (t.statusHistory ?? []).map((h) => ({ status: h.status, at: iso(h.at), by: h.by })),
    ai: { confidence: t.ai?.confidence ?? null, triggers: [...(t.ai?.triggers ?? [])] },
    actions: actions(t),
  };
}

export const toMessage = (m, ticketNumber) => ({
  id: String(m._id), ticketNumber, author: m.author, authorName: m.authorName ?? '', body: m.body,
  sources: (m.sources ?? []).map((s) => ({ slug: s.slug, title: s.title })), createdAt: iso(m.createdAt),
  clientMessageId: m.clientMessageId ?? null, deliveryState: m.syncState === 'pending' ? 'pending' : 'sent',
  attachments: (m.attachments ?? []).map(toAttachment),
});

export const toAttachment = (a) => ({ id: String(a.id ?? a._id), name: a.name, size: a.size, mime: a.mime, url: `/api/attachments/${a.id ?? a._id}` });

export const toKbSummary = (a) => ({ slug: a.slug, title: a.title, category: a.category, excerpt: a.body.slice(0, 160), updatedAt: iso(a.updatedAt) });
/** votes = {helpfulCount, notHelpfulCount, myVote: true|false|null} (myVote null when signed out or not voted). */
export const toKbArticle = (a, votes = { helpfulCount: 0, notHelpfulCount: 0, myVote: null }) =>
  ({ ...toKbSummary(a), body: a.body, locale: a.locale ?? 'en', views: a.views ?? 0, ...votes });

export const toUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, createdAt: iso(u.createdAt) });
const notifyPrefs = (n) => ({ email: { reply: n?.email?.reply !== false, status: n?.email?.status !== false, sla: n?.email?.sla !== false }, inApp: n?.inApp !== false });
/** toUser + preferences; returned by GET /api/auth/me, POST /api/auth/login and PATCH /api/me. */
export const toProfile = (u) => ({ ...toUser(u), locale: u.locale ?? 'en', notify: notifyPrefs(u.notify), phone: u.phone ?? null, organization: u.organization ?? null });

export const toNotification = (n) => ({ id: String(n._id), type: n.type, ticketNumber: n.ticketNumber, title: n.title, body: n.body ?? '',
  readAt: iso(n.readAt), createdAt: iso(n.createdAt) });
