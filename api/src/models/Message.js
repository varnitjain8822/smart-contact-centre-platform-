import mongoose from 'mongoose';
import { AUTHORS } from '../constants.js';

const { Schema } = mongoose;
const schema = new Schema({
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
  author: { type: String, enum: AUTHORS, required: true },
  authorName: String,
  body: { type: String, required: true, minlength: 1, maxlength: 10000 },
  sources: [{ _id: false, slug: String, title: String }],
  usedRecords: { type: Boolean, default: false },   // AI answer based on a customer-record lookup (v4 tools)
  attachments: [{ _id: false, id: Schema.Types.ObjectId, name: String, size: Number, mime: String }],   // denormalised from Attachment
  chatwootMessageId: { type: Number, default: null },
  clientMessageId: { type: String, default: null },
  syncState: { type: String, enum: ['pending', 'sent'], default: 'sent' },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ ticketId: 1, createdAt: 1 });
schema.index({ chatwootMessageId: 1 }, { unique: true, partialFilterExpression: { chatwootMessageId: { $type: 'number' } } });
schema.index({ ticketId: 1, clientMessageId: 1 }, { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } });
schema.index({ syncState: 1, nextAttemptAt: 1 }, { partialFilterExpression: { syncState: 'pending' } });

export const Message = mongoose.model('Message', schema);
