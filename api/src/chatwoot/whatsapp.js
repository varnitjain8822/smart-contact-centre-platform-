import { log } from '../lib/log.js';
import { nextTicketNumber } from '../models/Counter.js';
import { Message } from '../models/Message.js';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import * as sla from '../sla/sla.js';
import { emitMessage, emitTicket, upsertChatwootMessage } from '../tickets/service.js';
import { defaultCompanyId } from '../lib/company.js';

// Conversations of Chatwoot's WhatsApp (Cloud API) inbox. They reach us only through the agent-bot webhook (lld-backend §12).
export const isWhatsApp = (conv) => conv?.channel === 'Channel::Whatsapp';
export const WHATSAPP_MAX = 4096;   // Cloud API text body limit

const hindi = (s) => /[ऀ-ॿ]/.test(s);
const e164 = (p) => { const v = String(p ?? '').replace(/[\s().-]/g, ''); return /^\+[1-9]\d{6,14}$/.test(v) ? v : null; };

/** Markdown → plain WhatsApp text, at most `max` chars. */
export function plainText(s, max = WHATSAPP_MAX) {
  const t = String(s)
    .replace(/```[a-z]*\n?([\s\S]*?)```/g, '$1')                 // code fences
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!?\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')               // links/images
    .replace(/^#{1,6}\s+/gm, '')                                     // headings
    .replace(/^\s*[-*+]\s+/gm, '• ')                                 // bullets
    .replace(/(\*\*|__)(.+?)\1/g, '$2')                              // bold
    .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, '$1$2')    // italics
    .replace(/^>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Customer for a WhatsApp number: the portal user with that phone, else a new phone-only customer. */
async function customerFor(sender) {
  const phone = e164(sender?.phone_number);
  if (!phone) return null;
  const companyId = await defaultCompanyId();   // the WhatsApp inbox belongs to the default company (v4)
  const found = await User.findOne({ companyId, phone }).sort({ createdAt: 1 });
  if (found) return found;
  const name = String(sender.name ?? '').trim().slice(0, 80);
  return User.create({ companyId, name: name.length >= 2 ? name : phone, phone, locale: 'en' });   // ponytail: no merge when that person later registers with an email
}

/**
 * Incoming WhatsApp message (bot webhook payload). The first one creates the ticket (channel 'whatsapp', already linked
 * to the conversation); every one is stored as a customer message and marks the ticket as awaiting the bot.
 * Returns the ticket, or null when the sender has no usable phone number.
 */
export async function recordIncoming(p) {
  const conv = p.conversation;
  const text = String(p.content ?? '').trim() || '(Attachment)';
  let t = await Ticket.findOne({ 'chatwoot.conversationId': conv.id });
  if (!t) {
    const user = await customerFor(p.sender ?? conv.meta?.sender);
    if (!user) { log.warn({ evt: 'whatsapp_no_phone', conversationId: conv.id }); return null; }
    const now = new Date();
    const locale = hindi(text) ? 'hi' : user.locale ?? 'en';
    try {
      t = await Ticket.create({ number: await nextTicketNumber(), companyId: user.companyId, customerId: user._id, channel: 'whatsapp',
        subject: text.split('\n')[0].slice(0, 120), description: text.slice(0, 5000), status: 'ai_handling', locale, lastMessageAt: now,
        sla: sla.dueDates(now, 'medium'), statusHistory: [{ status: 'ai_handling', at: now, by: 'customer' }],
        chatwoot: { conversationId: conv.id, syncState: 'synced' }, ai: { pendingSince: now } });
      log.info({ evt: 'ticket_created', ticket: t.number, channel: 'whatsapp', userId: String(user._id) });
    } catch (e) {
      if (e.code !== 11000) throw e;
      t = await Ticket.findOne({ 'chatwoot.conversationId': conv.id });   // a parallel message created it
    }
  }
  const { message, inserted } = await upsertChatwootMessage(t, { ...p, content: text }, { author: 'customer', authorName: p.sender?.name ?? '' });
  if (!inserted) return t;   // webhook retry
  const set = { lastMessageAt: message.createdAt };
  if (t.status === 'ai_handling' && !t.ai.humanRequested) { set['ai.pendingSince'] = new Date(); set['ai.awaitingAcceptance'] = false; }
  await Ticket.updateOne({ _id: t._id }, { $set: set });
  emitMessage(t, message);
  await emitTicket(t._id);
  return Ticket.findById(t._id);
}
