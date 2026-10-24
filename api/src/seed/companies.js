// v4 company seed loader (PLAN-v4 data contract, lld-backend §14). Reads api/seed/companies/<slug>/, validates every file, then
// idempotently upserts the company, its demo customers (bcrypt passwords), mock records, KB (en + hi) and re-embeds that company.
// Hard problems (missing file, wrong shape, dangling reference) skip the company with a warning; soft ones (counts, lengths) only warn.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { reindex } from '../kb/vectors.js';
import { Company } from '../models/Company.js';
import { KbArticle } from '../models/KbArticle.js';
import { KbChunk } from '../models/KbChunk.js';
import { KbTranslation } from '../models/KbTranslation.js';
import { MockRecord } from '../models/MockRecord.js';
import { User } from '../models/User.js';
import { upsertKb } from './kb.js';

export const REQUIRED_FILES = ['company.json', 'kb.en.json', 'kb.hi.json', 'records.json', 'tools.json'];
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be #RRGGBB');
const str = z.string().trim().min(1);
const minutes = z.number().int().positive();

const CompanyFile = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/), name: str, sector: str, tagline: str, primaryColor: hex, accentColor: hex,
  logoText: str, supportHours: str,
  slaOverride: z.object({ critical: minutes, high: minutes, medium: minutes, low: minutes }).optional(),
  categories: z.array(z.object({ key: z.string().regex(/^[a-z0-9_-]{1,40}$/, 'lowercase letters, digits, - or _'), label: str, labelHi: str })).min(1),
  sources: z.array(z.object({ title: str, url: z.string().url(), accessedAt: str })).min(1),
});
const KbEn = z.array(z.object({ slug: z.string().regex(/^[a-z0-9-]{2,80}$/), category: str, title: str, body: str, keywords: z.array(z.string()) })).min(1);
const KbHi = z.array(z.object({ slug: str, title: str, body: str, keywords: z.array(z.string()).optional() }));
const Records = z.object({
  customers: z.array(z.object({ key: str, name: z.string().trim().min(2).max(80), email: z.string().email(), phone: z.string().optional(), password: z.string().min(8) })).min(1),
  collections: z.record(z.array(z.object({ customerKey: z.string().nullable().optional(), mock: z.literal(true) }).passthrough())),
});
const Tools = z.array(z.object({
  name: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), description: str,
  parameters: z.object({ type: z.literal('object'), properties: z.record(z.any()).default({}), required: z.array(z.string()).optional() }).passthrough(),
  collection: str, match: z.record(z.string()).default({}), scope: z.enum(['owner', 'public']), verify: z.array(z.string()).optional(),
}));
const Queries = z.array(z.object({ q: str, lang: z.enum(['en', 'hi']), as: z.string().optional(),   // as = signed-in customer key (eval)
  expect: z.object({ tool: z.string().optional(), articleSlug: z.string().optional(), answerContains: z.array(z.string()).optional() }) }));

const issues = (file, e) => e.issues.slice(0, 5).map((i) => `${file}: ${i.path.join('.') || '(root)'} ${i.message}`);
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const e164 = (p) => { const v = String(p ?? '').replace(/[\s().-]/g, ''); return /^\+[1-9]\d{6,14}$/.test(v) ? v : null; };

/** Validate one company directory. → {slug, ok, errors[], warnings[], data?} (data only when ok). */
export function validateCompanyDir(dir, slug = dir.split('/').filter(Boolean).at(-1)) {
  const errors = [], warnings = [];
  const missing = REQUIRED_FILES.filter((f) => !existsSync(join(dir, f)));
  if (missing.length) return { slug, ok: false, errors: [`missing ${missing.join(', ')}`], warnings };
  const raw = {};
  for (const f of [...REQUIRED_FILES, 'queries.json']) {
    if (!existsSync(join(dir, f))) continue;
    try { raw[f] = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch (e) { errors.push(`${f}: invalid JSON (${e.message})`); }
  }
  if (errors.length) return { slug, ok: false, errors, warnings };
  const parse = (schema, f) => { const r = schema.safeParse(raw[f]); if (!r.success) errors.push(...issues(f, r.error)); return r.data; };
  const company = parse(CompanyFile, 'company.json');
  const en = parse(KbEn, 'kb.en.json');
  const hi = parse(KbHi, 'kb.hi.json');
  const records = parse(Records, 'records.json');
  const tools = parse(Tools, 'tools.json');
  if (errors.length) return { slug, ok: false, errors, warnings };

  if (company.slug !== slug) errors.push(`company.json: slug "${company.slug}" ≠ directory "${slug}"`);
  const keys = new Set(company.categories.map((c) => c.key));
  if (keys.size !== company.categories.length) errors.push('company.json: duplicate category keys');
  if (keys.size < 5 || keys.size > 8) warnings.push(`company.json: ${keys.size} categories (contract: 5–8)`);
  const slugs = new Set(en.map((a) => a.slug));
  if (slugs.size !== en.length) errors.push('kb.en.json: duplicate slugs');
  for (const a of en) {
    if (!keys.has(a.category)) errors.push(`kb.en.json: ${a.slug} has unknown category "${a.category}"`);
    if (a.title.length < 5 || a.title.length > 140) warnings.push(`kb.en.json: ${a.slug} title length ${a.title.length} (5–140, truncated)`);
    const w = words(a.body);
    if (w < 120 || w > 400) warnings.push(`kb.en.json: ${a.slug} body ${w} words (contract: 120–400)`);
  }
  if (en.length < 15 || en.length > 20) warnings.push(`kb.en.json: ${en.length} articles (contract: 15–20)`);
  for (const t of hi) if (!slugs.has(t.slug)) errors.push(`kb.hi.json: ${t.slug} has no English article`);
  const hiSlugs = new Set(hi.map((t) => t.slug));
  const noHi = [...slugs].filter((s) => !hiSlugs.has(s));
  if (noHi.length) warnings.push(`kb.hi.json: no Hindi for ${noHi.join(', ')}`);

  const custKeys = new Set(records.customers.map((c) => c.key));
  if (custKeys.size !== records.customers.length) errors.push('records.json: duplicate customer keys');
  const emails = new Set(records.customers.map((c) => c.email.toLowerCase()));
  if (emails.size !== records.customers.length) errors.push('records.json: duplicate customer emails');
  for (const c of records.customers) if (c.phone && !e164(c.phone)) warnings.push(`records.json: ${c.key} phone is not E.164 (dropped)`);
  for (const [name, rows] of Object.entries(records.collections)) {
    for (const r of rows) if (r.customerKey && !custKeys.has(r.customerKey)) errors.push(`records.json: ${name} row references unknown customer "${r.customerKey}"`);
  }
  const toolNames = new Set();
  for (const t of tools) {
    if (toolNames.has(t.name)) errors.push(`tools.json: duplicate tool ${t.name}`);
    toolNames.add(t.name);
    if (!records.collections[t.collection]) errors.push(`tools.json: ${t.name} reads unknown collection "${t.collection}"`);
    const props = Object.keys(t.parameters.properties ?? {});
    for (const v of Object.values(t.match)) {
      if (v.startsWith('$') && !props.includes(v.slice(1))) errors.push(`tools.json: ${t.name} match uses unknown parameter ${v}`);
    }
    for (const v of t.verify ?? []) if (!props.includes(v)) errors.push(`tools.json: ${t.name} verify field "${v}" is not a parameter`);
    if (t.scope === 'public' && t.verify?.length) warnings.push(`tools.json: ${t.name} is public but has verify fields`);
  }
  let queries = [];
  if (!raw['queries.json']) warnings.push('queries.json missing (no eval for this company)');
  else {
    const r = Queries.safeParse(raw['queries.json']);
    if (!r.success) warnings.push(...issues('queries.json', r.error));
    else {
      queries = r.data;
      for (const q of queries) {
        if (q.expect.tool && !toolNames.has(q.expect.tool)) warnings.push(`queries.json: "${q.q.slice(0, 40)}" expects unknown tool ${q.expect.tool}`);
        if (q.as && !custKeys.has(q.as)) warnings.push(`queries.json: "${q.q.slice(0, 40)}" as unknown customer ${q.as}`);
        if (q.expect.articleSlug && !slugs.has(q.expect.articleSlug)) warnings.push(`queries.json: "${q.q.slice(0, 40)}" expects unknown article ${q.expect.articleSlug}`);
      }
    }
  }
  if (errors.length) return { slug, ok: false, errors, warnings };
  return { slug, ok: true, errors, warnings, data: { company, en, hi, records, tools, queries } };
}

/** Upsert one validated company. Idempotent: records/KB are replaced from the files; existing users keep their password. */
export async function loadCompany({ company, en, hi, records, tools }, { reembed = true } = {}) {
  const c = await Company.findOneAndUpdate({ slug: company.slug },
    { $set: { ...company, slaOverride: company.slaOverride ?? null, tools, demo: true } }, { upsert: true, new: true, lean: true });
  const companyId = c._id;
  const ids = {};
  for (const u of records.customers) {
    const email = u.email.toLowerCase();
    const phone = e164(u.phone);
    const existing = await User.findOne({ companyId, email }, '_id').lean();
    if (existing) {
      await User.updateOne({ _id: existing._id }, { $set: { name: u.name, ...(phone && { phone }) } });
      ids[u.key] = existing._id;
    } else {
      ids[u.key] = (await User.create({ companyId, email, name: u.name, ...(phone && { phone }), passwordHash: await bcrypt.hash(u.password, 10) }))._id;
    }
  }
  await MockRecord.deleteMany({ companyId });
  const docs = Object.entries(records.collections).flatMap(([collection, rows]) => rows.map(({ customerKey, mock, ...data }) =>
    ({ companyId, collection, customerId: customerKey ? ids[customerKey] : null, data, mock: true })));
  if (docs.length) await MockRecord.insertMany(docs);

  const enDocs = en.map((a) => ({ slug: a.slug, category: a.category, title: a.title.slice(0, 140), body: a.body, keywords: a.keywords }));
  const kw = new Map(en.map((a) => [a.slug, a.keywords]));
  const hiDocs = hi.map((t) => ({ slug: t.slug, locale: 'hi', title: t.title.slice(0, 140), body: t.body, keywords: [...(t.keywords ?? []), ...kw.get(t.slug)] }));
  await upsertKb(companyId, enDocs, hiDocs);
  const keep = en.map((a) => a.slug);
  await KbArticle.deleteMany({ companyId, slug: { $nin: keep } });
  await KbTranslation.deleteMany({ companyId, slug: { $nin: hi.map((t) => t.slug) } });
  await KbChunk.deleteMany({ companyId, $or: [{ slug: { $nin: keep } }, { locale: 'hi', slug: { $nin: hi.map((t) => t.slug) } }] });
  const embedded = reembed ? await reindex(companyId) : 0;
  return { companyId, customerIds: ids, customers: records.customers.length, records: docs.length, articles: en.length, translations: hi.length, tools: tools.length, embedded };
}

/** Validate + load every company directory under `root`. `print` gets one line per company / problem. */
export async function loadCompanies(root, { print = console.log, only, reembed = true } = {}) {
  const dirs = existsSync(root) ? readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];
  const out = [];
  for (const slug of dirs.filter((s) => !only || only.includes(s))) {
    const v = validateCompanyDir(join(root, slug), slug);
    for (const w of v.warnings) print(`  warn ${slug}: ${w}`);
    if (!v.ok) { print(`SKIP ${slug}: ${v.errors.join('; ')}`); out.push({ slug, ok: false, errors: v.errors }); continue; }
    const r = await loadCompany(v.data, { reembed });
    print(`ok   ${slug}: ${r.customers} customers, ${r.records} records, ${r.articles} articles (${r.translations} hi), ${r.tools} tools, ${r.embedded} re-embedded`);
    out.push({ slug, ok: true, ...r, queries: v.data.queries, data: v.data });
  }
  return out;
}
