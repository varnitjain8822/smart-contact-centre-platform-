import mongoose from 'mongoose';
import { defaultCompanyId } from '../lib/company.js';

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },   // v4 tenancy: unique email per company
  email: { type: String, lowercase: true, trim: true },   // absent only for WhatsApp phone-only customers (v3)
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

schema.index({ companyId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
schema.index({ companyId: 1, phone: 1 });   // OTP by SMS + WhatsApp customer link
// pre-v4 callers (WhatsApp, tests) that name no company get the default one
schema.pre('validate', async function setCompany() { if (!this.companyId) this.companyId = await defaultCompanyId(); });

export const User = mongoose.model('User', schema);
