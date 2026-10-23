import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: String,
  source: { type: String, enum: ['inbox', 'bot'] },
  event: String,
  receivedAt: { type: Date, default: Date.now, expires: 604800 },
}, { versionKey: false });

export const WebhookDelivery = mongoose.model('WebhookDelivery', schema);
