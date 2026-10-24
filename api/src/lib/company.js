import mongoose from 'mongoose';
import { CATEGORIES, CATEGORY_LABEL } from '../constants.js';
import { Company } from '../models/Company.js';
import { AppError } from './errors.js';
import { log } from './log.js';

// Tenancy helpers (lld-backend §14). Every request under /api resolves one company: `X-Company: <slug>` header or `?company=`,
// default `smartcc` (the original single-company portal).
export const DEFAULT_SLUG = 'smartcc';
const HI = { Account: 'खाता', Billing: 'बिलिंग', Technical: 'तकनीकी', 'Commerce & Trade': 'व्यापार और कारोबार',
  'Compliance & GST': 'अनुपालन और GST', 'Logistics & Orders': 'डिलीवरी और ऑर्डर', General: 'सामान्य' };
export const DEFAULT_COMPANY = {
  slug: DEFAULT_SLUG, name: 'SmartCC', sector: 'Service platform',
  tagline: 'A service platform for Indian small businesses (accounts, billing, GST compliance, import/export registration, logistics)',
  primaryColor: '#3D35C8', accentColor: '#6D28D9', logoText: 'SmartCC', supportHours: '',
  categories: CATEGORIES.map((k) => ({ key: k, label: k, labelHi: HI[k] })), tools: [], demo: false,
};

/** The default company, created on first use (no cached id: tests wipe the db between cases). */
export async function defaultCompany() {
  const q = { slug: DEFAULT_SLUG };
  try {
    return await Company.findOneAndUpdate(q, { $setOnInsert: DEFAULT_COMPANY }, { upsert: true, new: true, lean: true });
  } catch (e) {
    if (e.code === 11000) return Company.findOne(q).lean();   // parallel first use
    throw e;
  }
}
export const companyBySlug = (slug) => (!slug || slug === DEFAULT_SLUG ? defaultCompany() : Company.findOne({ slug }).lean());
/** Company of a ticket or user (default when missing). */
export const companyOf = async (doc) => (doc?.companyId && await Company.findById(doc.companyId).lean()) || defaultCompany();
export const defaultCompanyId = async () => (await defaultCompany())._id;

export const categoryKeys = (c) => (c?.categories?.length ? c.categories.map((x) => x.key) : CATEGORIES);
/** Category used when neither the customer nor the AI picked one: 'General'/'general' if the company has it, else the last one. */
export const fallbackCategory = (c) => { const k = categoryKeys(c); return k.find((x) => x.toLowerCase() === 'general') ?? k.at(-1); };
/** Chatwoot label for a category key ('Commerce & Trade' → 'commerce-trade'; company keys are already label-safe). */
export const cwLabel = (key) => CATEGORY_LABEL[key] ?? String(key).toLowerCase().replace(/[^a-z0-9_]+/g, '-').replace(/^-|-$/g, '');

/** Middleware for /api: req.company (+ req.companyGiven when the client named one). Unknown slug → 404. */
export async function companyContext(req, res, next) {
  const slug = String(req.get('x-company') ?? req.query.company ?? '').trim().toLowerCase();
  req.companyGiven = !!slug;
  req.company = await companyBySlug(slug);
  if (!req.company) return next(new AppError(404, 'COMPANY_NOT_FOUND', 'Unknown company'));
  next();
}

export const toCompany = (c) => ({ slug: c.slug, name: c.name, sector: c.sector ?? '', tagline: c.tagline ?? '', primaryColor: c.primaryColor,
  accentColor: c.accentColor, logoText: c.logoText || c.name, supportHours: c.supportHours ?? '', demo: !!c.demo,
  categories: (c.categories ?? []).map(({ key, label, labelHi }) => ({ key, label, labelHi: labelHi ?? label })) });

/** Startup migration: documents from before v4 (no companyId) belong to the default company. Idempotent; run BEFORE syncIndexes. */
export async function migrateTenancy() {
  const id = await defaultCompanyId();
  const out = {};
  // raw collection names: works whichever models the calling script registered
  for (const name of ['users', 'tickets', 'kbarticles', 'kbtranslations', 'kbchunks', 'notifications', 'kbvotes', 'assistantfeedbacks']) {
    const r = await mongoose.connection.collection(name).updateMany({ companyId: { $exists: false } }, { $set: { companyId: id } });
    if (r.modifiedCount) out[name] = r.modifiedCount;
  }
  if (Object.keys(out).length) log.info({ evt: 'tenancy_migrated', company: DEFAULT_SLUG, ...out });
  return out;
}
