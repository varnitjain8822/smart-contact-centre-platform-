import mongoose from 'mongoose';

// A tenant (lld-backend §14). Loaded from api/seed/companies/<slug>/company.json (+ tools.json) by `npm run seed:companies`;
// the default `smartcc` company is created at startup. `tools` = the company's AI lookup specs (ai/tools.js).
const schema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, match: /^[a-z0-9-]{2,40}$/ },
  name: { type: String, required: true, maxlength: 120 },
  sector: { type: String, default: '' },
  tagline: { type: String, default: '' },
  primaryColor: { type: String, default: '#3D35C8' },
  accentColor: { type: String, default: '#6D28D9' },
  logoText: { type: String, default: '' },
  supportHours: { type: String, default: '' },
  slaOverride: { type: Object, default: null },   // {critical,high,medium,low} first-response minutes
  categories: [{ _id: false, key: String, label: String, labelHi: String }],
  sources: [{ _id: false, title: String, url: String, accessedAt: String }],
  tools: { type: Array, default: [] },
  demo: { type: Boolean, default: true },        // seeded mock data → "Demo data" ribbon
}, { timestamps: true });

export const Company = mongoose.model('Company', schema);
