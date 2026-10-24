import mongoose from 'mongoose';
import { cfg } from '../config.js';
import * as attachments from '../attachments/service.js';
import { PRIORITIES } from '../constants.js';
import { categoryKeys, companyOf, cwLabel, fallbackCategory } from '../lib/company.js';
import { inboxFor } from '../chatwoot/inboxes.js';
import { notify } from '../notifications/service.js';
import { mapStatus, priorityFromCw } from '../chatwoot/statusMap.js';
import { deps } from '../deps.js';
import { AppError } from '../lib/errors.js';
import { log } from '../lib/log.js';
import { nextTicketNumber } from '../models/Counter.js';
import { Message } from '../models/Message.js';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import * as hub from '../realtime/hub.js';
import * as sla from '../sla/sla.js';
import { toMessage, toTicketDetail } from './dto.js';

const cw = () => deps.chatwoot;
const backoff = (prevAttempts) => (prevAttempts < 20 ? 30_000 : 300_000);
// an inline Chatwoot attempt follows: keep the worker off the row until it has finished or failed (no double send)
const afterInline = (now) => new Date(now.getTime() + backoff(0));
// REQ-004: wait this long for the inline Chatwoot attempt; a slower one finishes (or reschedules) in the background
const capped = (p) => Promise.race([p, new Promise((r) => { setTimeout(r, cfg.CHATWOOT_INLINE_MS); })]);
const toDate = (v) => (typeof v === 'number' ? new Date(v * 1000) : new Date(v));
const invalidState = (t) => new AppError(409, 'INVALID_STATE', 'This action is not available for this ticket', { status: t.status });

export const SYSTEM_TEXT = {
  en: { askedHuman: 'You asked for a person. An agent will reply here.', handedOff: "We've passed this to our support team. An agent will reply here." },
  hi: { askedHuman: 'आपने किसी व्यक्ति से बात करने को कहा है। एजेंट यहीं जवाब देंगे।', handedOff: 'हमने आपका मामला हमारी सपोर्ट टीम को भेज दिया है। एजेंट यहीं जवाब देंगे।' },
};

// ---------- events ----------
export async function emitTicket(id) {
  const t = await Ticket.findById(id);
  if (t) hub.emit(t.customerId, 'ticket.updated', { ticket: toTicketDetail(t) });
  return t;
}
export const emitMessage = (t, m) => hub.emit(t.customerId, 'message.created', { ticketNumber: t.number, message: toMessage(m, t.number) });

/** Best-effort: phone + organisation onto the Chatwoot contact. Never throws (a taken phone number is a 422 there). */
export function pushContactProfile(user) {
  if (!user.chatwoot?.contactId) return Promise.resolve();   // no contact yet: syncTicket pushes it after creating one
  return cw().updateContact(user.chatwoot.contactId, { phone_number: user.phone ?? '', additional_attributes: { company_name: user.organization ?? '' } })
    .catch((e) => log.warn({ evt: 'contact_profile_sync_failed', userId: String(user._id), status: e.status, err: e.message }));
}

// ---------- reads ----------
export async function getForUser(userId, number) {
  const t = await Ticket.findOne({ number, customerId: userId });
  if (!t) throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
  return t;
}

const FAR = new Date('9999-12-31T00:00:00.000Z');   // resolved tickets sort last by SLA
const asDate = (s) => { const d = new Date(s); if (Number.isNaN(d.getTime())) throw badCursor(); return d; };
const badCursor = () => new AppError(400, 'VALIDATION_FAILED', 'Invalid cursor');
export const SORTS = {
  updated: { dir: -1, key: '$updatedAt', parse: asDate },
  created: { dir: -1, key: '$createdAt', parse: asDate },
  priority: { dir: -1, key: { $indexOfArray: [PRIORITIES, '$priority'] }, parse: (s) => { if (!/^\d$/.test(s)) throw badCursor(); return Number(s); } },
  sla: { dir: 1, parse: asDate, key: { $cond: [{ $eq: ['$status', 'resolved'] }, FAR,
    { $cond: [{ $gt: ['$sla.firstResponseAt', null] }, '$sla.resolutionDueAt', '$sla.responseDueAt'] }] } },
};

/**
 * Customer's tickets. Cursor (opaque to clients) is `<sort key>_<id>`; for sort=updated that is the original `<updatedAt ISO>_<id>`
 * (a bare ISO date is still accepted). status[] overrides scope.
 */
export async function list(userId, { scope = 'open', before, limit = 20, q, status, category, priority, from, to, sort = 'updated' }) {
  const s = SORTS[sort];
  const match = { customerId: userId };
  if (status?.length) match.status = { $in: status };
  else if (scope === 'open') match.status = { $ne: 'resolved' };
  else if (scope === 'resolved') match.status = 'resolved';
  if (category?.length) match.category = { $in: category };
  if (priority?.length) match.priority = { $in: priority };
  if (from || to) match.createdAt = { ...(from && { $gte: from }), ...(to && { $lt: to }) };
  if (q) {
    const num = q.match(/^(?:sc-?)?(\d{1,9})$/i);
    if (num) match.number = `SC-${num[1]}`;
    else match.$text = { $search: q };
  }
  const pipeline = [{ $match: match }, { $addFields: { _k: s.key } }];
  if (before) {
    const sep = before.lastIndexOf('_');
    const [rawK, id] = sep > 0 && /^[a-f0-9]{24}$/.test(before.slice(sep + 1)) ? [before.slice(0, sep), before.slice(sep + 1)] : [before, null];
    const k = s.parse(rawK), op = s.dir < 0 ? '$lt' : '$gt';
    pipeline.push({ $match: { $or: [{ _k: { [op]: k } }, ...(id ? [{ _k: k, _id: { [op]: new mongoose.Types.ObjectId(id) } }] : [])] } });
  }
  // ponytail: computed sort key = no index-backed sort; fine for one customer's tickets, add stored keys if a customer holds 10k+
  pipeline.push({ $sort: { _k: s.dir, _id: s.dir } }, { $limit: limit + 1 });
  const rows = await Ticket.aggregate(pipeline);
  const items = rows.slice(0, limit), last = items.at(-1);
  const enc = (k) => (k instanceof Date ? k.toISOString() : String(k));
  return { items: items.map((r) => Ticket.hydrate(r)), nextCursor: rows.length > limit ? `${enc(last._k)}_${last._id}` : null };
}

export const messages = async (ticket) =>
  (await Message.find({ ticketId: ticket._id }).sort({ createdAt: -1 }).limit(500)).reverse();

// ---------- create / sync ----------
export async function create(user, input, idemKey) {
  const replay = async (t) => ({ ticket: t, replay: true,
    messages: await Message.find({ ticketId: t._id, author: 'customer' }).sort({ createdAt: 1 }).limit(1) });
  if (idemKey) {
    const existing = await Ticket.findOne({ customerId: user._id, idempotencyKey: idemKey });
    if (existing) return replay(existing);
  }
  const atts = await attachments.claimable(user._id, input.attachmentIds ?? [], null);
  const now = new Date();
  const company = await companyOf(user);
  const ticket = new Ticket({
    number: await nextTicketNumber(), companyId: company._id, customerId: user._id, subject: input.subject, description: input.description,
    customerCategory: input.category ?? null, category: input.category ?? fallbackCategory(company), priority: 'medium', status: 'ai_handling',
    idempotencyKey: idemKey || undefined, lastMessageAt: now, locale: user.locale ?? 'en', sla: sla.dueDates(now, 'medium', company.slaOverride),
    statusHistory: [{ status: 'ai_handling', at: now, by: 'customer' }],
    chatwoot: { syncState: 'pending', nextAttemptAt: afterInline(now) },
    ai: { pendingSince: now },   // first message awaits a bot decision; recovery sweep covers a lost bot webhook
  });
  try { await ticket.save(); } catch (e) {
    if (e.code === 11000 && idemKey) return replay(await Ticket.findOne({ customerId: user._id, idempotencyKey: idemKey }));
    throw e;
  }
  // REQ-004: the description is the first message; it travels inside createConversation
  // with attachments the opener stays pending until they reach Chatwoot as a follow-up message (worker retries it)
  let first = await Message.create({ ticketId: ticket._id, author: 'customer', authorName: user.name, body: ticket.description,
    attachments: atts.map(attachments.ref), syncState: atts.length ? 'pending' : 'sent', nextAttemptAt: atts.length ? afterInline(now) : null });
  if (atts.length) await attachments.link(atts, ticket, first);
  log.info({ evt: 'ticket_created', ticket: ticket.number, userId: String(user._id), attachments: atts.length });
  await capped(syncTicket(ticket).then(() => atts.length && syncMessage(first).catch((e) => markMsgRetry(first, e)), (e) => markRetry(ticket, e)));
  first = await Message.findById(first._id);
  return { ticket: await Ticket.findById(ticket._id), messages: [first], replay: false };
}

export async function syncTicket(ticket) {
  const user = await User.findById(ticket.customerId);
  const company = await companyOf(ticket);
  const { inboxId, teamId } = inboxFor(company.slug);   // v4: the company's own inbox + team
  let ref = user.chatwoot?.sourceId ? user.chatwoot : null;
  if (!ref) {
    try {
      ref = await cw().createContact({ name: user.name, email: user.email, identifier: String(user._id), inboxId });
    } catch (e) {
      if (e.status !== 422) throw e;
      ref = await cw().findContactByIdentifier(String(user._id), inboxId, user.email);
      if (!ref) throw e;
    }
    await User.updateOne({ _id: user._id }, { $set: { chatwoot: { contactId: ref.contactId, sourceId: ref.sourceId } } });
    if (user.phone || user.organization) void pushContactProfile({ ...user.toObject(), chatwoot: ref });
  }
  // a failed earlier attempt may still have created it (timeout after Chatwoot committed): never create twice (REQ-046)
  const conv = (ticket.chatwoot.attempts && await cw().findConversationByTicket(ref.contactId, ticket.number)) || await cw().createConversation({ sourceId: ref.sourceId, contactId: ref.contactId, ticketNumber: ticket.number,
    slaDueAt: sla.activeDue(ticket).toISOString(), content: `${ticket.subject}\n\n${ticket.description}`, inboxId, teamId, company: company.name });
  const r = await Ticket.updateOne({ _id: ticket._id, 'chatwoot.conversationId': null },
    { $set: { 'chatwoot.conversationId': conv.id, 'chatwoot.syncState': 'synced', 'chatwoot.lastError': null } });
  if (!r.matchedCount) log.warn({ evt: 'possible_duplicate_conversation', ticket: ticket.number, conversationId: conv.id });
  await emitTicket(ticket._id);
}

export async function markRetry(ticket, err) {
  const prev = ticket.chatwoot?.attempts ?? 0;
  await Ticket.updateOne({ _id: ticket._id }, { $inc: { 'chatwoot.attempts': 1 },
    $set: { 'chatwoot.nextAttemptAt': new Date(Date.now() + backoff(prev)), 'chatwoot.lastError': String(err.message).slice(0, 300) } });
  log.warn({ evt: 'sync_retry', ticket: ticket.number, attempts: prev + 1, err: err.message });
}

// ---------- customer messages ----------
export async function addCustomerMessage(user, number, body, clientMessageId, attachmentIds = []) {
  const t = await getForUser(user._id, number);
  if (t.channel === 'whatsapp') throw new AppError(409, 'WHATSAPP_TICKET', 'Reply to this ticket on WhatsApp');
  const existing = await Message.findOne({ ticketId: t._id, clientMessageId });
  if (existing) return { message: existing, replay: true };
  const atts = await attachments.claimable(user._id, attachmentIds, t);
  const now = new Date();
  let msg;
  const inline = t.chatwoot.syncState === 'synced';
  try {
    msg = await Message.create({ ticketId: t._id, author: 'customer', authorName: user.name, body, clientMessageId, syncState: 'pending',
      nextAttemptAt: inline ? afterInline(now) : now, attachments: atts.map(attachments.ref) });
  } catch (e) {
    if (e.code === 11000) return { message: await Message.findOne({ ticketId: t._id, clientMessageId }), replay: true };
    throw e;
  }
  if (atts.length) await attachments.link(atts, t, msg);
  const set = { lastMessageAt: now };
  if (t.status === 'ai_handling' && !t.ai.humanRequested) { set['ai.pendingSince'] = now; set['ai.awaitingAcceptance'] = false; }
  await Ticket.updateOne({ _id: t._id }, { $set: set });
  if (inline) await capped(syncMessage(msg, t).catch((e) => markMsgRetry(msg, e)));
  // Chatwoot reopens resolved→pending (bot) / snoozed→open itself; status reaches us via webhook
  return { message: await Message.findById(msg._id), replay: false };
}

export async function syncMessage(msg, t) {
  t ??= await Ticket.findById(msg.ticketId);
  const sourceId = `smartcc-${msg._id}`;   // lets a retry find a send that timed out after Chatwoot stored it (REQ-046)
  const r = (msg.attempts && (await cw().listMessages(t.chatwoot.conversationId)).find((x) => x.source_id === sourceId))
    || await cw().createMessage(t.chatwoot.conversationId, {
      content: msg.clientMessageId ? msg.body : undefined,   // the opener's text already went in createConversation: send only its files
      messageType: 'incoming', sourceId, attachments: msg.attachments?.length ? await attachments.filesFor(msg) : undefined }, 'admin');
  const m = await Message.findByIdAndUpdate(msg._id, { $set: { syncState: 'sent', chatwootMessageId: r.id } }, { new: true });
  emitMessage(t, m);
}

export async function markMsgRetry(msg, err) {
  const prev = msg.attempts ?? 0;
  await Message.updateOne({ _id: msg._id }, { $inc: { attempts: 1 }, $set: { nextAttemptAt: new Date(Date.now() + backoff(prev)) } });
  log.warn({ evt: 'sync_retry', messageId: String(msg._id), attempts: prev + 1, err: err.message });
}

// ---------- Chatwoot side of customer actions (replayed by the worker on failure) ----------
export const ACTIONS = {
  resolve: (t) => cw().toggleStatus(t.chatwoot.conversationId, 'resolved', 'admin'),
  handoff: async (t) => {
    const content = t.ai.humanRequested ? 'Customer requested a human agent.'
      : `AI hand-off — ${t.ai.lastError ? 'ai_unavailable' : `tier ${t.ai.tier ?? 'human'}`}\nSummary: ${t.ai.summary || '(AI unavailable)'}`;
    await cw().createMessage(t.chatwoot.conversationId, { content, isPrivate: true }, 'bot');
    await cw().toggleStatus(t.chatwoot.conversationId, 'open', 'bot');      // bot token → Chatwoot bot_handoff!
  },
  csat: async (t) => {
    const { rating, comment } = t.csat;
    await cw().setCustomAttributes(t.chatwoot.conversationId, { csat: rating }, 'admin');
    await cw().createMessage(t.chatwoot.conversationId, { content: `CSAT ${rating}/5${comment ? ` — ${comment}` : ''}`, isPrivate: true }, 'admin');
  },
};

export async function setPendingAction(t, kind) {
  await Ticket.updateOne({ _id: t._id }, { $addToSet: { 'chatwoot.pendingActions': kind } });
}

async function chatwootAction(id, kind) {
  const t = await Ticket.findById(id);
  try {
    if (!t.chatwoot.conversationId) throw new Error('not_synced');
    await ACTIONS[kind](t);
  } catch (e) {
    log.warn({ evt: 'chatwoot_action_failed', kind, ticket: t.number, err: e.message });
    await setPendingAction(t, kind);
  }
}

// ---------- customer actions ----------
export async function accept(userId, number) {
  const t = await getForUser(userId, number);
  if (!(t.status === 'ai_handling' && t.ai.awaitingAcceptance)) throw invalidState(t);
  const now = new Date();
  const r = await Ticket.updateOne({ _id: t._id, status: 'ai_handling', 'ai.awaitingAcceptance': true },
    { $set: { status: 'resolved', resolvedAt: now, resolutionType: 'ai', 'ai.awaitingAcceptance': false },
      $push: { statusHistory: { status: 'resolved', at: now, by: 'customer' } } });
  if (!r.matchedCount) throw invalidState(t);
  log.info({ evt: 'ai_answer_accepted', ticket: t.number });
  await chatwootAction(t._id, 'resolve');
  return emitTicket(t._id);
}

export async function requestHuman(userId, number) {
  const t = await getForUser(userId, number);
  if (!(t.status === 'ai_handling' && !t.ai.humanRequested)) throw invalidState(t);
  const now = new Date();
  const r = await Ticket.updateOne({ _id: t._id, status: 'ai_handling', 'ai.humanRequested': { $ne: true } },
    { $set: { status: 'in_progress', 'ai.humanRequested': true, 'ai.awaitingAcceptance': false, 'ai.pendingSince': null },
      $push: { statusHistory: { status: 'in_progress', at: now, by: 'customer' } } });
  if (!r.matchedCount) throw invalidState(t);
  const sys = await Message.create({ ticketId: t._id, author: 'system', authorName: 'SmartCC', body: SYSTEM_TEXT[t.locale ?? 'en'].askedHuman });
  emitMessage(t, sys);
  await chatwootAction(t._id, 'handoff');
  return emitTicket(t._id);
}

export async function resolve(userId, number) {
  const t = await getForUser(userId, number);
  if (t.status === 'resolved') throw invalidState(t);
  const now = new Date();
  const resolutionType = t.ai.tier === 'auto' && t.ai.awaitingAcceptance ? 'ai' : 'human';
  const r = await Ticket.updateOne({ _id: t._id, status: { $ne: 'resolved' } },
    { $set: { status: 'resolved', resolvedAt: now, resolutionType, 'ai.awaitingAcceptance': false, 'ai.pendingSince': null },
      $push: { statusHistory: { status: 'resolved', at: now, by: 'customer' } } });
  if (!r.matchedCount) throw invalidState(t);
  log.info({ evt: 'ticket_resolved', ticket: t.number, by: 'customer', resolutionType });
  await chatwootAction(t._id, 'resolve');
  return emitTicket(t._id);
}

export async function rate(userId, number, rating, comment = '') {
  const t = await getForUser(userId, number);
  if (t.status !== 'resolved') throw invalidState(t);
  const r = await Ticket.updateOne({ _id: t._id, 'csat.rating': null }, { $set: { csat: { rating, comment, submittedAt: new Date() } } });
  if (!r.matchedCount) throw new AppError(409, 'ALREADY_RATED', 'You already rated this ticket');
  log.info({ evt: 'csat_submitted', ticket: t.number, rating });
  await chatwootAction(t._id, 'csat');
  return emitTicket(t._id);
}

// ---------- Chatwoot → portal ----------
export async function findTicket(conv) {
  if (conv?.id == null) return null;
  const t = await Ticket.findOne({ 'chatwoot.conversationId': conv.id });
  if (t) return t;
  const number = conv.custom_attributes?.ticket_number;
  const owner = conv.meta?.sender?.identifier;   // contact identifier = portal user id; blocks claiming another customer's ticket
  if (!number || !/^[a-f0-9]{24}$/.test(owner ?? '')) return null;
  // webhook may arrive before the createConversation response is persisted
  const r = await Ticket.updateOne({ number: String(number), customerId: owner, 'chatwoot.conversationId': null },
    { $set: { 'chatwoot.conversationId': conv.id, 'chatwoot.syncState': 'synced', 'chatwoot.lastError': null } });
  // no match: either not ours, or createTicket linked it between our two queries (e2e: bot webhook dropped → AI answer only after the 60 s sweep)
  return r.matchedCount ? Ticket.findOne({ number: String(number) }) : Ticket.findOne({ 'chatwoot.conversationId': conv.id });
}

export async function applyConversationState(ticket, conv, source) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const eventAt = toDate(conv.updated_at);
    if (ticket.chatwoot.lastEventAt && eventAt < ticket.chatwoot.lastEventAt) return ticket;   // stale
    const now = new Date();
    const set = {};
    let push;
    const newStatus = mapStatus(conv.status);
    if (newStatus && newStatus !== ticket.status) {
      set.status = newStatus;
      push = { statusHistory: { status: newStatus, at: now, by: newStatus === 'ai_handling' ? 'system' : 'agent' } };
      if (newStatus === 'resolved') { set.resolvedAt = now; set.resolutionType = ticket.resolutionType ?? 'human'; set['ai.awaitingAcceptance'] = false; }
      if (ticket.status === 'resolved') {
        Object.assign(set, { resolvedAt: null, resolutionType: null, 'ai.autoCount': 0, 'ai.humanRequested': false, 'sla.breachedAt': null });
        // reopened to the bot: the bot webhook may have been handled first (and skipped, ticket still resolved) — let the sweep answer
        if (newStatus === 'ai_handling') set['ai.pendingSince'] = now;
      }
      if (newStatus !== 'ai_handling') { set['ai.awaitingAcceptance'] = false; set['ai.pendingSince'] = null; }
    }
    const company = await companyOf(ticket);
    const newPriority = priorityFromCw[conv.priority];
    if (newPriority && newPriority !== ticket.priority) {
      const due = sla.dueDates(ticket.createdAt, newPriority, company.slaOverride);
      Object.assign(set, { priority: newPriority, 'sla.responseDueAt': due.responseDueAt, 'sla.resolutionDueAt': due.resolutionDueAt, 'sla.breachedAt': null });
    }
    const labels = conv.labels ?? [];
    const cat = categoryKeys(company).find((c) => labels.includes(cwLabel(c)));
    if (cat && cat !== ticket.category) set.category = cat;
    set['chatwoot.labels'] = labels;
    set['chatwoot.lastEventAt'] = eventAt;
    const fresh = await Ticket.findOneAndUpdate({ _id: ticket._id, 'chatwoot.lastEventAt': ticket.chatwoot.lastEventAt ?? null },
      { $set: set, ...(push && { $push: push }) }, { new: true });
    if (!fresh) { ticket = await Ticket.findById(ticket._id); continue; }   // concurrent event: re-evaluate once
    if (set.priority && conv.id != null) {
      const due = sla.activeDue(fresh).toISOString();
      if (conv.custom_attributes?.sla_due_at !== due) {
        cw().setCustomAttributes(conv.id, { sla_due_at: due }).catch((e) => log.warn({ evt: 'chatwoot_attr_failed', err: e.message }));
      }
    }
    if (set.status === 'resolved') log.info({ evt: 'ticket_resolved', ticket: fresh.number, by: 'agent', source });
    if (set.status === 'waiting_on_customer' || set.status === 'resolved') await notify(fresh, 'status', { status: set.status });
    if (set.status || set.priority || set.category) hub.emit(fresh.customerId, 'ticket.updated', { ticket: toTicketDetail(fresh) });
    return fresh;
  }
  return ticket;
}

export async function upsertChatwootMessage(ticket, cwMsg, overrides) {
  // REST responses give epoch *seconds*: x.000 would sort a fast bot answer above the customer message it answers.
  // The true time lies in [s, s+999 ms] and before now, so min(now, s+999) never precedes it.
  const createdAt = typeof cwMsg.created_at === 'number' ? new Date(Math.min(Date.now(), cwMsg.created_at * 1000 + 999)) : toDate(cwMsg.created_at);
  const query = { chatwootMessageId: cwMsg.id };
  try {
    const r = await Message.findOneAndUpdate(query,
      { $setOnInsert: { ticketId: ticket._id, author: overrides.author, authorName: overrides.authorName, body: cwMsg.content?.trim() ? cwMsg.content : cwMsg.attachments?.some((a) => a?.data_url) ? '(Attachment)' : '(Attachment — not shown in the portal)',
        sources: [], createdAt, updatedAt: createdAt, syncState: 'sent' } },
      { upsert: true, new: true, includeResultMetadata: true, timestamps: false });
    return { message: r.value, inserted: !r.lastErrorObject.updatedExisting };
  } catch (e) {
    if (e.code !== 11000) throw e;
    return { message: await Message.findOne(query), inserted: false };   // lost an upsert race
  }
}

/** Store an outgoing public Chatwoot message (agent or bot) and update ticket bookkeeping. */
export async function recordOutgoing(ticket, cwMsg) {
  const author = cwMsg.sender?.type === 'agent_bot' || cwMsg.sender_type === 'AgentBot' ? 'ai' : 'agent';
  const res = await upsertChatwootMessage(ticket, cwMsg,
    { author, authorName: author === 'ai' ? 'AI assistant' : cwMsg.sender?.name ?? 'Support agent' });
  if (!res.inserted) return res;
  if (cwMsg.attachments?.length && cw().downloadAttachment) res.message = await attachments.ingestAgentAttachments(ticket, res.message, cwMsg.attachments);
  const at = res.message.createdAt;
  await Ticket.updateOne({ _id: ticket._id }, { $set: { lastMessageAt: at, ...(author === 'agent' && { 'ai.awaitingAcceptance': false }) } });
  const first = await Ticket.updateOne({ _id: ticket._id, 'sla.firstResponseAt': null }, { $set: { 'sla.firstResponseAt': at } });
  const fresh = await Ticket.findById(ticket._id);
  if (first.modifiedCount && fresh.chatwoot.conversationId != null) {
    cw().setCustomAttributes(fresh.chatwoot.conversationId, { sla_due_at: sla.activeDue(fresh).toISOString() })
      .catch((e) => log.warn({ evt: 'chatwoot_attr_failed', err: e.message }));
  }
  if (author === 'agent') await notify(fresh, 'agent_reply', { preview: res.message.body });
  emitMessage(fresh, res.message);
  hub.emit(fresh.customerId, 'ticket.updated', { ticket: toTicketDetail(fresh) });
  return res;
}

/** Pull conversation state + outgoing public messages from Chatwoot (self-heal for lost webhooks, REQ-045). */
export async function reconcile(ticket) {
  const id = ticket.chatwoot.conversationId;
  try {
    const conv = await cw().getConversation(id);
    await applyConversationState(ticket, conv, 'reconcile');
    for (const m of await cw().listMessages(id)) {
      if (m.private || m.message_type !== 1) continue;
      await recordOutgoing(ticket, m);
    }
  } catch (e) {
    log.warn({ evt: 'reconcile_failed', ticket: ticket.number, err: e.message });
  }
}

/** E10 side effect: background reconcile, at most once per 30 s per ticket (claimed atomically). */
export async function maybeReconcile(ticket) {
  if (ticket.chatwoot.conversationId == null) return false;
  const claim = await Ticket.updateOne({ _id: ticket._id,
    $or: [{ 'chatwoot.reconciledAt': null }, { 'chatwoot.reconciledAt': { $lt: new Date(Date.now() - 30_000) } }] },
  { $set: { 'chatwoot.reconciledAt': new Date() } });
  if (claim.modifiedCount) setImmediate(() => reconcile(ticket));
  return claim.modifiedCount > 0;
}

// ---------- transcript ----------
const ROLE_LABEL = { customer: 'You', agent: 'Agent', ai: 'AI assistant', system: 'SmartCC' };
export async function transcript(t) {
  const lines = [`SmartCC ticket ${t.number}`, `Subject: ${t.subject}`, `Status: ${t.status}`, `Created: ${t.createdAt.toISOString()}`, ''];
  for (const m of await messages(t)) {
    lines.push(`[${m.createdAt.toISOString()}] ${m.authorName || ROLE_LABEL[m.author]} (${ROLE_LABEL[m.author]}):`, m.body);
    for (const a of m.attachments ?? []) lines.push(`  Attachment: ${a.name} (${a.mime}, ${a.size} bytes)`);
    lines.push('');
  }
  return lines.join('\n');
}
