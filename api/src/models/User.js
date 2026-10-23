import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  name: { type: String, required: true, minlength: 2, maxlength: 80 },
  passwordHash: { type: String, required: true, select: false },
  passwordChangedAt: { type: Date, default: Date.now },
  phone: { type: String, match: /^\+[1-9]\d{6,14}$/ },          // E.164, normalised by PATCH /api/me
  organization: { type: String, maxlength: 120 },
  chatwoot: { contactId: Number, sourceId: String },
  locale: { type: String, enum: ['en', 'hi'], default: 'en' },
  notify: {
    email: { reply: { type: Boolean, default: true }, status: { type: Boolean, default: true }, sla: { type: Boolean, default: true } },
    inApp: { type: Boolean, default: true },
  },
}, { timestamps: true });

export const User = mongoose.model('User', schema);
