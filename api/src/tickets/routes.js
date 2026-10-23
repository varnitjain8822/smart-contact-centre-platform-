import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import { uploadFile } from '../attachments/routes.js';
import * as attachments from '../attachments/service.js';
import { CATEGORIES, PRIORITIES, STATUSES } from '../constants.js';
import { limit } from '../lib/limit.js';
import { log } from '../lib/log.js';
import { toAttachment, toMessage, toTicketDetail, toTicketSummary } from './dto.js';
import * as svc from './service.js';

export const ticketsRouter = Router();
ticketsRouter.use(requireUser);

const listQuery = z.object({
  scope: z.enum(['open', 'resolved', 'all']).default('open'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().max(100).optional(),   // opaque nextCursor from the previous page (same sort)
  q: z.string().trim().max(100).optional().transform((v) => v || undefined),
  status: many(STATUSES),
  category: many(CATEGORIES),
  priority: many(PRIORITIES),
  from: day(false),
  to: day(true),
  sort: z.enum(['updated', 'created', 'priority', 'sla']).default('updated'),
});
// ?status=a&status=b, ?status[]=a or ?status=a,b
function many(values) {
  return z.preprocess((v) => (v == null || v === '' ? undefined : [].concat(v).flatMap((s) => String(s).split(',')).map((s) => s.trim()).filter(Boolean)),
    z.array(z.enum(values)).max(20).optional());
}
// ISO date or datetime; a date-only `to` includes that whole day (upper bound is exclusive)
function day(isEnd) {
  return z.string().optional().transform((s, ctx) => {
    if (!s) return undefined;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) { ctx.addIssue({ code: 'custom', message: 'Invalid date' }); return z.NEVER; }
    return isEnd ? new Date(d.getTime() + (/^\d{4}-\d{2}-\d{2}$/.test(s) ? 86400_000 : 1)) : d;
  });
}
const attachmentIds = z.array(z.string().regex(/^[a-f0-9]{24}$/, 'Invalid attachment id')).max(attachments.MAX_PER_MESSAGE, `At most ${attachments.MAX_PER_MESSAGE} attachments`).default([]);
const createBody = z.object({
  subject: z.string().trim().min(5, 'Subject must be at least 5 characters').max(120, 'Subject must be at most 120 characters'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(5000, 'Description must be at most 5000 characters'),
  category: z.enum(CATEGORIES).nullable().optional(),
  attachmentIds,
});
const idemKey = z.string().regex(/^[A-Za-z0-9-]{8,64}$/, 'Idempotency-Key must be 8–64 characters [A-Za-z0-9-]').optional();
const sendBody = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(5000, 'Message must be at most 5000 characters'),
  clientMessageId: z.string().uuid('clientMessageId must be a UUID'),
  attachmentIds,
});
const csatBody = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).default('') });
const number = (req) => String(req.params.number);

ticketsRouter.get('/', async (req, res) => {
  const q = listQuery.parse(Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k.replace(/\[\]$/, ''), v])));
  const { items, nextCursor } = await svc.list(req.user._id, q);
  const now = new Date();
  res.json({ items: items.map((t) => toTicketSummary(t, now)), nextCursor });
});

ticketsRouter.post('/', async (req, res) => {
  const key = idemKey.parse(req.get('idempotency-key') || undefined);
  const b = createBody.parse(req.body);
  const r = await svc.create(req.user, b, key);
  res.status(r.replay ? 200 : 201).json({ ticket: toTicketDetail(r.ticket), messages: r.messages.map((m) => toMessage(m, r.ticket.number)) });
});

ticketsRouter.get('/:number', async (req, res) => {
  res.json({ ticket: toTicketDetail(await svc.getForUser(req.user._id, number(req))) });
});

ticketsRouter.get('/:number/messages', async (req, res) => {
  const t = await svc.getForUser(req.user._id, number(req));
  const items = await svc.messages(t);
  res.json({ items: items.map((m) => toMessage(m, t.number)) });
  await svc.maybeReconcile(t).catch((e) => log.warn({ evt: 'reconcile_claim_failed', ticket: t.number, err: e.message }));
});

ticketsRouter.post('/:number/messages', limit({ windowMs: 60_000, max: 30, key: (req) => String(req.user._id) }), async (req, res) => {
  const b = sendBody.parse(req.body);
  const r = await svc.addCustomerMessage(req.user, number(req), b.body, b.clientMessageId, b.attachmentIds);
  res.status(r.replay ? 200 : 201).json({ message: toMessage(r.message, number(req)) });
});

const action = (fn) => async (req, res) => res.json({ ticket: toTicketDetail(await fn(req.user._id, number(req))) });
ticketsRouter.post('/:number/accept', action(svc.accept));
ticketsRouter.post('/:number/handoff', action(svc.requestHuman));
ticketsRouter.post('/:number/resolve', action(svc.resolve));
ticketsRouter.post('/:number/csat', async (req, res) => {
  const b = csatBody.parse(req.body);
  res.json({ ticket: toTicketDetail(await svc.rate(req.user._id, number(req), b.rating, b.comment)) });
});

ticketsRouter.post('/:number/attachments', limit({ windowMs: 60_000, max: 30, key: (req) => String(req.user._id) }), uploadFile, async (req, res) => {
  const t = await svc.getForUser(req.user._id, number(req));
  res.status(201).json({ attachment: toAttachment(await attachments.storeUpload(req.user._id, t, req.file)) });
});

ticketsRouter.get('/:number/transcript', async (req, res) => {
  z.object({ format: z.literal('txt').default('txt') }).parse(req.query);
  const t = await svc.getForUser(req.user._id, number(req));
  res.type('text/plain; charset=utf-8').attachment(`${t.number}-transcript.txt`).send(await svc.transcript(t));
});
