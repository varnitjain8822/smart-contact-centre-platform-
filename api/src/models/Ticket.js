import mongoose from 'mongoose';
import { CATEGORIES, PRIORITIES, STATUSES, TIERS, TRIGGERS } from '../constants.js';

const { Schema } = mongoose;
const schema = new Schema({
  number: { type: String, required: true, unique: true, match: /^SC-\d+$/ },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // portal tickets are validated to 5/20+ chars at the route; WhatsApp tickets take the customer's first message as is
  subject: { type: String, maxlength: 120 },
  description: { type: String, maxlength: 5000 },
  channel: { type: String, enum: ['portal', 'whatsapp'], default: 'portal' },
  customerCategory: { type: String, enum: [...CATEGORIES, null], default: null },
  category: { type: String, enum: CATEGORIES, default: 'General' },
  priority: { type: String, enum: PRIORITIES, default: 'medium' },
  status: { type: String, enum: STATUSES, default: 'ai_handling' },
  locale: { type: String, enum: ['en', 'hi'], default: 'en' },
  notifyEmailAt: { type: Date, default: null },   // last notification email (throttle: 1 per ticket per 5 min)
  idempotencyKey: { type: String, maxlength: 64 },
  resolutionType: { type: String, enum: ['ai', 'human', null], default: null },
  resolvedAt: { type: Date, default: null },
  lastMessageAt: { type: Date, default: Date.now },
  sla: {
    responseDueAt: { type: Date, required: true },
    resolutionDueAt: { type: Date, required: true },
    firstResponseAt: { type: Date, default: null },
    breachedAt: { type: Date, default: null },
  },
  ai: {
    tier: { type: String, enum: [...TIERS, null], default: null },
    intent: { type: String, maxlength: 40 },
    confidence: { type: Number, min: 0, max: 1, default: null },
    triggers: [{ type: String, enum: TRIGGERS }],
    summary: { type: String, maxlength: 300 },
    autoCount: { type: Number, default: 0 },
    awaitingAcceptance: { type: Boolean, default: false },
    humanRequested: { type: Boolean, default: false },
    pendingSince: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  csat: {
    rating: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, maxlength: 1000, default: '' },
    submittedAt: { type: Date, default: null },
  },
  chatwoot: {
    conversationId: { type: Number, default: null },
    syncState: { type: String, enum: ['pending', 'synced'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lastError: { type: String, default: null },
    lastEventAt: { type: Date, default: null },
    reconciledAt: { type: Date, default: null },
    labels: [String],
    pendingActions: [{ type: String, enum: ['resolve', 'handoff', 'csat'] }],
  },
  statusHistory: [{ _id: false, status: { type: String, enum: STATUSES }, at: Date,
    by: { type: String, enum: ['customer', 'agent', 'ai', 'system'] } }],
}, { timestamps: true });

schema.index({ customerId: 1, updatedAt: -1 });
schema.index({ subject: 'text', description: 'text', number: 'text' }, { weights: { number: 10, subject: 5, description: 1 }, name: 'ticket_text' });
schema.index({ 'chatwoot.conversationId': 1 }, { unique: true, partialFilterExpression: { 'chatwoot.conversationId': { $type: 'number' } } });
schema.index({ customerId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
schema.index({ 'chatwoot.syncState': 1, 'chatwoot.nextAttemptAt': 1 });
schema.index({ status: 1, 'ai.pendingSince': 1 });
schema.index({ status: 1, 'sla.breachedAt': 1 });

export const Ticket = mongoose.model('Ticket', schema);
