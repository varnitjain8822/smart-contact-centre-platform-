import mongoose from 'mongoose';

const { Schema } = mongoose;
export const NOTIFICATION_TYPES = ['agent_reply', 'status', 'sla_breach', 'ai_answer'];
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  ticketNumber: { type: String, required: true },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, default: '', maxlength: 500 },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, expires: 90 * 86400 },   // TTL 90 days
}, { versionKey: false });

schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, readAt: 1 });

export const Notification = mongoose.model('Notification', schema);
