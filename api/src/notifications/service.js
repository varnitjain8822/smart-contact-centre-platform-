import { createHmac, timingSafeEqual } from 'node:crypto';
import { cfg } from '../config.js';
import { deps } from '../deps.js';
import { log } from '../lib/log.js';
import { Notification } from '../models/Notification.js';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import * as hub from '../realtime/hub.js';
import { toNotification } from '../tickets/dto.js';
import { TEXT, email } from './templates.js';
import { companyOf } from '../lib/company.js';

export const EMAIL_THROTTLE_MS = 5 * 60_000;
const PREF = { agent_reply: 'reply', ai_answer: 'reply', status: 'status', sla_breach: 'sla' };

// Unsubscribe token: `<userId>.<hmac>`; key derived from JWT_SECRET but domain-separated so it can never pass as a session.
const mac = (uid) => createHmac('sha256', `${cfg.JWT_SECRET}:unsubscribe`).update(String(uid)).digest('base64url');
export const unsubscribeToken = (uid) => `${uid}.${mac(uid)}`;
export function verifyUnsubscribeToken(token) {
  const [uid, sig] = String(token ?? '').split('.');
  if (!/^[a-f0-9]{24}$/.test(uid ?? '') || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(mac(uid));
  return a.length === b.length && timingSafeEqual(a, b) ? uid : null;
}

export const unreadCount = (userId) => Notification.countDocuments({ userId, readAt: null });

/**
 * In-app notification (awaited) + throttled email (background, returned as `email` for tests).
 * Never throws: a notification problem must not break the caller. type: agent_reply | ai_answer | status | sla_breach; extra: {status, preview}
 */
export async function notify(ticket, type, extra = {}) {
  try {
    const user = await User.findById(ticket.customerId, 'email name locale notify');
    if (!user) return {};
    const locale = user.locale ?? 'en';
    const text = TEXT[locale][type]({ number: ticket.number, ...extra, preview: (extra.preview ?? '').slice(0, 200) });
    if (user.notify?.inApp !== false) {
      const n = await Notification.create({ userId: user._id, companyId: ticket.companyId, type, ticketNumber: ticket.number, title: text.title, body: text.body ?? '' });
      hub.emit(user._id, 'notification.created', { notification: toNotification(n), unreadCount: await unreadCount(user._id) });
    }
    return { email: sendEmail(ticket, user, type, text) };
  } catch (e) {
    log.warn({ evt: 'notification_failed', ticket: ticket?.number, type, err: e.message });
    return {};
  }
}

async function sendEmail(ticket, user, type, { title, body = '' }) {
  const locale = user.locale ?? 'en';
  try {
    if (!user.email || user.notify?.email?.[PREF[type]] === false) return;   // WhatsApp phone-only customers have no email
    const claim = await Ticket.updateOne({ _id: ticket._id, $or: [{ notifyEmailAt: null }, { notifyEmailAt: { $lte: new Date(Date.now() - EMAIL_THROTTLE_MS) } }] },
      { $set: { notifyEmailAt: new Date() } }, { timestamps: false });
    if (!claim.modifiedCount) return log.info({ evt: 'notification_email_throttled', ticket: ticket.number, type });
    const unsubUrl = `${cfg.WEB_ORIGIN}/api/notifications/unsubscribe?token=${unsubscribeToken(user._id)}`;
    const portal = `${cfg.WEB_ORIGIN}/c/${(await companyOf(ticket)).slug}`;   // v4: the company's portal
    const mail = email(locale, { name: user.name, title, body, ticketUrl: `${portal}/tickets/${ticket.number}`, unsubUrl });
    await deps.mailer.send({ to: user.email, ...mail, headers: { 'List-Unsubscribe': `<${unsubUrl}>` } });
    log.info({ evt: 'notification_email_sent', ticket: ticket.number, type });
  } catch (e) {
    log.warn({ evt: 'notification_email_failed', ticket: ticket.number, type, err: e.message });
  }
}
