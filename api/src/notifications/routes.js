import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { toNotification } from '../tickets/dto.js';
import { UNSUBSCRIBED_PAGE } from './templates.js';
import { unreadCount, verifyUnsubscribeToken } from './service.js';

export const notificationsRouter = Router();

// Public: link from the email footer. Turns off all notification emails for that user.
notificationsRouter.get('/unsubscribe', async (req, res) => {
  const uid = verifyUnsubscribeToken(req.query.token);
  const user = uid && await User.findByIdAndUpdate(uid, { $set: { 'notify.email.reply': false, 'notify.email.status': false, 'notify.email.sla': false } }, { new: true });
  res.status(user ? 200 : 400).type('html').send(user ? UNSUBSCRIBED_PAGE[user.locale] ?? UNSUBSCRIBED_PAGE.en : UNSUBSCRIBED_PAGE.invalid);
});

notificationsRouter.use(requireUser);

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  // cursor `<createdAt ISO>_<id>` from nextCursor
  before: z.string().regex(/^[^_]+_[a-f0-9]{24}$/, 'Invalid cursor').transform((s) => s.split('_'))
    .refine(([at]) => !Number.isNaN(Date.parse(at)), 'Invalid cursor').transform(([at, id]) => ({ at: new Date(at), id })).optional(),
  unread: z.enum(['true', 'false']).optional(),
});

notificationsRouter.get('/', async (req, res) => {
  const q = listQuery.parse(req.query);
  const filter = { userId: req.user._id, ...(q.unread === 'true' && { readAt: null }) };
  if (q.before) filter.$or = [{ createdAt: { $lt: q.before.at } }, { createdAt: q.before.at, _id: { $lt: q.before.id } }];
  const rows = await Notification.find(filter).sort({ createdAt: -1, _id: -1 }).limit(q.limit + 1);
  const items = rows.slice(0, q.limit), last = items.at(-1);
  res.json({ items: items.map(toNotification), unreadCount: await unreadCount(req.user._id),
    nextCursor: rows.length > q.limit ? `${last.createdAt.toISOString()}_${last._id}` : null });
});

const readBody = z.union([
  z.object({ ids: z.array(z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id')).min(1).max(100) }).strict(),
  z.object({ all: z.literal(true) }).strict(),
]);

notificationsRouter.post('/read', async (req, res) => {
  const b = readBody.parse(req.body);
  await Notification.updateMany({ userId: req.user._id, readAt: null, ...(b.ids && { _id: { $in: b.ids } }) }, { $set: { readAt: new Date() } });
  res.json({ unreadCount: await unreadCount(req.user._id) });
});
