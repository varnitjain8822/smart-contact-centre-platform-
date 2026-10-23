import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },   // absent only for WhatsApp phone-only customers (v3)
  name: { type: String, required: true, minlength: 2, maxlength: 80 },
  passwordHash: { type: String, select: false },                 // absent for accounts made with a sign-in code / from WhatsApp (v3)
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

schema.index({ phone: 1 });   // OTP by SMS + WhatsApp customer link

export const User = mongoose.model('User', schema);
