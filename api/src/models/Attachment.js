import mongoose from 'mongoose';

const { Schema } = mongoose;
// A stored file. `path` is relative to UPLOAD_DIR. Only `userId` (the ticket owner) may download it.
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null },     // null = uploaded before the ticket exists
  messageId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },   // null = not sent yet
  source: { type: String, enum: ['customer', 'agent'], required: true },
  name: { type: String, required: true, maxlength: 200 },
  size: { type: Number, required: true },
  mime: { type: String, required: true },
  path: { type: String, required: true },
  chatwootAttachmentId: { type: Number, default: null },
}, { timestamps: true });

schema.index({ ticketId: 1 });
schema.index({ messageId: 1, createdAt: 1 });   // orphan sweep
schema.index({ chatwootAttachmentId: 1 }, { unique: true, partialFilterExpression: { chatwootAttachmentId: { $type: 'number' } } });

export const Attachment = mongoose.model('Attachment', schema);
