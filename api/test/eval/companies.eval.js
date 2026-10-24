// npm run eval:companies — per-company query eval (PLAN-v4). Loads api/seed/companies/* (or COMPANIES_DIR) into an in-memory db with the
// real embedding model, then for each queries.json entry checks:
//   KB:   expect.articleSlug in the hybrid top-3 for that company and language;
//   tool: the tool-selection step (real Groq, GROQ_* from the root .env) calls expect.tool — or no tool when none is expected.
//         The chosen call is also executed as the query's customer (`as`, else inferred) and the outcome printed.
// Prints accuracy per company; GROQ missing → tool checks are skipped. EVAL_MIN (default 0) fails the run below that overall accuracy.
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, expect, test } from 'vitest';
import * as embedder from '../../src/kb/embed.js';
import { deps } from '../../src/deps.js';
import { configured } from '../../src/ai/groq.js';
import { executeTool, selectTools } from '../../src/ai/tools.js';
import { searchArticles } from '../../src/kb/retrieve.js';
import { Company } from '../../src/models/Company.js';
import { MockRecord } from '../../src/models/MockRecord.js';
import { User } from '../../src/models/User.js';
import { loadCompanies } from '../../src/seed/companies.js';
import { startDb, stopDb } from '../db.js';

const ROOT = process.env.COMPANIES_DIR ?? fileURLToPath(new URL('../../seed/companies', import.meta.url));
const ONLY = process.env.EVAL_ONLY?.split(',');
let loaded = [];

beforeAll(async () => {
  await startDb();
  deps.embedder = process.env.EVAL_EMBED === 'off' ? null : embedder;
  loaded = (await loadCompanies(ROOT, { only: ONLY })).filter((c) => c.ok);
}, 1_800_000);
afterAll(stopDb);

const flat = (s) => String(s).toLowerCase().replace(/[\s-]+/g, '');
/** Customer for a tool query: `as`, else the owner of a record of that tool's collection whose values appear in the query, else the first owner. */
async function customerFor(c, company, q) {
  if (q.as) return User.findById(c.customerIds[q.as]).lean();
  const spec = company.tools.find((t) => t.name === q.expect.tool);
  if (!spec) return null;
  const rows = await MockRecord.find({ companyId: company._id, collection: spec.collection, customerId: { $ne: null } }).lean();
  const text = flat(q.q);
  const hit = rows.find((r) => Object.values(r.data).some((v) => (typeof v === 'string' || typeof v === 'number') && String(v).length >= 4 && text.includes(flat(v))));
  return User.findById((hit ?? rows[0])?.customerId).lean();
}

test('per-company query accuracy', async () => {
  const groq = configured();
  const lines = [];
  let pass = 0, total = 0;
  for (const c of loaded) {
    const company = await Company.findById(c.companyId).lean();
    let kbN = 0, kbOk = 0, toolN = 0, toolOk = 0, ok = 0;
    const misses = [];
    for (const q of c.queries) {
      let good = true;
      if (q.expect.articleSlug) {
        kbN++;
        const top = (await searchArticles(q.q, { locale: q.lang, limit: 3, companyId: company._id })).map((a) => a.slug);
        if (top.includes(q.expect.articleSlug)) kbOk++;
        else { good = false; misses.push(`KB   ${q.lang} "${q.q}" → [${top.join(', ')}] want ${q.expect.articleSlug}`); }
      }
      if (groq && company.tools.length) {
        toolN++;
        let calls = [];
        try { ({ toolCalls: calls } = await selectTools(company, [{ role: 'user', content: q.q }])); } catch (e) { calls = [{ name: `ERROR ${e.code ?? e.message}` }]; }
        const got = calls[0]?.name ?? null;
        const want = q.expect.tool ?? null;
        let outcome = '';
        if (got && company.tools.some((t) => t.name === got)) {
          const r = await executeTool(company, await customerFor(c, company, { ...q, expect: { tool: got } }), got, calls[0].args);
          outcome = ` ${JSON.stringify(calls[0].args)} → ${r.error ?? (r.found ? `found ${r.count}` : 'not found')}`;
        }
        if (got === want) toolOk++;
        else { good = false; misses.push(`TOOL ${q.lang} "${q.q}" → ${got ?? 'none'}${outcome} want ${want ?? 'none'}`); }
      }
      if (good) ok++;
    }
    pass += ok; total += c.queries.length;
    const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(0)}% (${a}/${b})` : 'n/a');
    lines.push(`${c.slug.padEnd(14)} overall ${pct(ok, c.queries.length).padEnd(13)} KB top-3 ${pct(kbOk, kbN).padEnd(13)} tool ${groq ? pct(toolOk, toolN) : 'skipped (no GROQ_API_KEY)'}`);
    for (const m of misses) lines.push(`    miss ${m}`);
  }
  console.log(`Company eval (${loaded.length} companies, ${total} queries${groq ? ', real Groq' : ''}):\n${lines.join('\n')}`);
  expect(total ? pass / total : 1).toBeGreaterThanOrEqual(Number(process.env.EVAL_MIN ?? 0));
}, 1_800_000);
