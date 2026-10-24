// v4 multi-company: seed loader, tenancy isolation, tool executor, AI lookups (lld-backend §14)
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import * as bot from '../../src/ai/bot.js';
import { MAX_TOOL_CALLS, executeTool, lookup } from '../../src/ai/tools.js';
import { clearProfileCache } from '../../src/admin/analytics.js';
import { Company } from '../../src/models/Company.js';
import { KbArticle } from '../../src/models/KbArticle.js';
import { KbTranslation } from '../../src/models/KbTranslation.js';
import { Message } from '../../src/models/Message.js';
import { MockRecord } from '../../src/models/MockRecord.js';
import { Ticket } from '../../src/models/Ticket.js';
import { User } from '../../src/models/User.js';
import { loadCompanies, validateCompanyDir } from '../../src/seed/companies.js';
import { newTicket, setup, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

const FIXTURES = fileURLToPath(new URL('../fixtures/companies', import.meta.url));
let app, cw, groq, acme, users;
const quiet = () => {};

beforeAll(async () => {
  await startDb();
  ({ app, chatwoot: cw, groq } = await setup());
  [{ customerIds: users }] = await loadCompanies(FIXTURES, { print: quiet });
  acme = await Company.findOne({ slug: 'acme' }).lean();
});
afterAll(stopDb);
beforeEach(() => { groq.complete.mockReset(); groq.fail = null; });

/** agent signed in to a company portal (X-Company header on every request) */
async function signIn(slug, email, password = 'Demo@1234') {
  const agent = request.agent(app);
  const h = (r) => r.set('X-Company', slug);
  await h(agent.post('/api/auth/login')).send({ email, password }).expect(200);
  return { get: (p) => h(agent.get(p)), post: (p) => h(agent.post(p)), raw: agent };
}

// ---------- seed loader ----------
test('loader: idempotent; customers with bcrypt passwords, mock records owned by customers, KB en+hi, company tools', async () => {
  const again = await loadCompanies(FIXTURES, { print: quiet });
  expect(again[0]).toMatchObject({ slug: 'acme', ok: true, customers: 3, records: 6, articles: 3, translations: 3, tools: 4 });
  expect(await User.countDocuments({ companyId: acme._id })).toBe(3);
  expect(await MockRecord.countDocuments({ companyId: acme._id })).toBe(6);
  expect(await MockRecord.countDocuments({ companyId: acme._id, mock: true, customerId: users.asha })).toBe(3);
  expect(await KbArticle.countDocuments({ companyId: acme._id })).toBe(3);
  expect(await KbTranslation.countDocuments({ companyId: acme._id, locale: 'hi' })).toBe(3);
  const asha = await User.findOne({ companyId: acme._id, email: 'asha@acme.test' }).select('+passwordHash').lean();
  expect(asha.passwordHash).toMatch(/^\$2[aby]\$/);
  expect(asha.phone).toBe('+919876543210');
  expect(acme).toMatchObject({ name: 'Acme Retail', demo: true, slaOverride: { critical: 30 } });
  expect(acme.tools.map((t) => t.name)).toEqual(['get_order_status', 'list_my_orders', 'get_application_status', 'search_lost_found']);
});

test('loader validation: missing files / bad shape / dangling refs skip the company with a reason; soft issues only warn', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cos-'));
  try {
    cpSync(join(FIXTURES, 'acme'), join(dir, 'acme'), { recursive: true });
    const ok = validateCompanyDir(join(dir, 'acme'));
    expect(ok.ok).toBe(true);
    expect(ok.warnings.join('\n')).toMatch(/3 articles \(contract: 15–20\)/);
    rmSync(join(dir, 'acme', 'tools.json'));
    expect(validateCompanyDir(join(dir, 'acme'))).toMatchObject({ ok: false, errors: ['missing tools.json'] });
    cpSync(join(FIXTURES, 'acme'), join(dir, 'beta'), { recursive: true });
    expect(validateCompanyDir(join(dir, 'beta')).errors.join()).toMatch(/slug "acme" ≠ directory "beta"/);
    writeFileSync(join(dir, 'acme', 'tools.json'), JSON.stringify([{ name: 'x', description: 'd', collection: 'nope', scope: 'owner',
      parameters: { type: 'object', properties: {} }, match: { a: '$missing' } }]));
    const bad = validateCompanyDir(join(dir, 'acme'));
    expect(bad.ok).toBe(false);
    expect(bad.errors.join('\n')).toMatch(/unknown collection "nope"/);
    expect(bad.errors.join('\n')).toMatch(/unknown parameter \$missing/);
    writeFileSync(join(dir, 'acme', 'kb.en.json'), '{oops');
    expect(validateCompanyDir(join(dir, 'acme')).errors[0]).toMatch(/kb.en.json: invalid JSON/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------- portal API ----------
test('companies: list for the picker + branding/topics per slug; unknown slug → 404 COMPANY_NOT_FOUND', async () => {
  const list = (await request(app).get('/api/companies').expect(200)).body.items;
  expect(list.map((c) => c.slug)).toEqual(['smartcc', 'acme']);
  const { company } = (await request(app).get('/api/companies/acme').expect(200)).body;
  expect(company).toMatchObject({ slug: 'acme', name: 'Acme Retail', demo: true, primaryColor: '#E8B400', logoText: 'Acme' });
  expect(company.categories[1]).toEqual({ key: 'returns', label: 'Returns & refunds', labelHi: 'वापसी और रिफ़ंड' });
  expect(company.tools).toBeUndefined();
  expect((await request(app).get('/api/companies/nope').expect(404)).body.error.code).toBe('COMPANY_NOT_FOUND');
  expect((await request(app).get('/api/kb/articles').set('X-Company', 'nope').expect(404)).body.error.code).toBe('COMPANY_NOT_FOUND');
});

test('tenancy: KB per company (list, search, article, category keys)', async () => {
  const a = (await request(app).get('/api/kb/articles').set('X-Company', 'acme').expect(200)).body.items.map((x) => x.slug).sort();
  expect(a).toEqual(['card-declined', 'return-window', 'track-order']);
  const s = (await request(app).get('/api/kb/articles').expect(200)).body.items.map((x) => x.slug);
  expect(s).not.toContain('return-window');
  expect(s).toContain('refund-status');
  expect((await request(app).get('/api/kb/articles?q=refund').set('X-Company', 'acme').expect(200)).body.items.map((x) => x.slug)).toEqual(['return-window']);
  await request(app).get('/api/kb/articles/refund-status').set('X-Company', 'acme').expect(404);
  await request(app).get('/api/kb/articles/return-window').expect(404);
  expect((await request(app).get('/api/kb/articles/return-window?locale=hi').set('X-Company', 'acme').expect(200)).body.article.title).toBe('वापसी की समय-सीमा और रिफ़ंड');
  await request(app).get('/api/kb/articles?category=returns').set('X-Company', 'acme').expect(200);
  await request(app).get('/api/kb/articles?category=returns').expect(400);   // not a SmartCC topic
});

test('tenancy: users are unique per company; a session is only valid on its own portal; tickets never cross', async () => {
  // same email registers in two companies
  const email = `dup${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').set('X-Forwarded-For', '10.9.0.1').send({ name: 'Dup One', email, password: 's3cure-pass' }).expect(201);
  await request(app).post('/api/auth/register').set('X-Company', 'acme').set('X-Forwarded-For', '10.9.0.2')
    .send({ name: 'Dup Two', email, password: 's3cure-pass' }).expect(201);
  expect((await request(app).post('/api/auth/register').set('X-Company', 'acme').set('X-Forwarded-For', '10.9.0.3')
    .send({ name: 'Dup Three', email, password: 's3cure-pass' }).expect(409)).body.error.code).toBe('EMAIL_TAKEN');
  // acme demo customer cannot sign in on the SmartCC portal
  await request(app).post('/api/auth/login').send({ email: 'asha@acme.test', password: 'Demo@1234' }).expect(401);
  const asha = await signIn('acme', 'asha@acme.test');
  const t = (await asha.post('/api/tickets').send({ subject: 'Where is my order', description: 'Order AC-1001 has not arrived yet, please check.', category: 'orders' }).expect(201)).body.ticket;
  expect(t.category).toBe('orders');
  const doc = await Ticket.findOne({ number: t.number }).lean();
  expect(String(doc.companyId)).toBe(String(acme._id));
  expect(Math.abs(doc.sla.responseDueAt - doc.createdAt - 300 * 60_000)).toBeLessThan(1000);   // slaOverride.medium
  expect(cw.named('createConversation').at(-1)[1]).toMatchObject({ company: 'Acme Retail', inboxId: 7 });
  await asha.post('/api/tickets').send({ subject: 'Bad topic', description: 'This topic is from another company entirely.', category: 'Billing' }).expect(400);
  // the same cookie on another company's portal = signed out; on its own portal it works
  await asha.raw.get('/api/tickets').set('X-Company', 'smartcc').expect(401);
  await asha.get('/api/auth/me').expect(200);
  // a SmartCC customer and another acme customer cannot see it
  const other = await signUp(app);
  await other.get(`/api/tickets/${t.number}`).expect(404);
  const ben = await signIn('acme', 'ben@acme.test');
  await ben.get(`/api/tickets/${t.number}`).expect(404);
  expect((await ben.get('/api/tickets?scope=all').expect(200)).body.items).toEqual([]);
});

// ---------- tool executor ----------
const ashaUser = () => User.findById(users.asha).lean();
const benUser = () => User.findById(users.ben).lean();

test('executor: owner scope returns only the signed-in customer\'s records (redacted); another customer\'s record = not found', async () => {
  const r = await executeTool(acme, await ashaUser(), 'get_order_status', { orderNo: 'ac-1001' });
  expect(r).toEqual({ found: true, count: 1, records: [{ orderNo: 'AC-1001', status: 'Shipped', date: '2026-10-20', cardNumber: 'XXXX1234', total: 2499 }] });
  expect(await executeTool(acme, await benUser(), 'get_order_status', { orderNo: 'AC-1001' })).toEqual({ found: false });
  expect(await executeTool(acme, await ashaUser(), 'get_order_status', { orderNo: 'AC-2001' })).toEqual({ found: false });
  const all = await executeTool(acme, await ashaUser(), 'list_my_orders', {});   // empty match = all own rows, newest first
  expect(all.records.map((x) => x.orderNo)).toEqual(['AC-1001', 'AC-1002']);
  expect(JSON.stringify(all)).not.toMatch(/4111|5500|AC-2001/);
  expect(await executeTool(acme, null, 'list_my_orders', {})).toEqual({ error: 'sign_in_required' });
  expect(await executeTool(acme, await ashaUser(), 'get_order_status', {})).toEqual({ error: 'missing_argument', fields: ['orderNo'] });
  expect(await executeTool(acme, await ashaUser(), 'drop_tables', {})).toEqual({ error: 'unknown_tool' });
  // KB-only customer: no records
  const kav = await User.findOne({ companyId: acme._id, email: 'kavya@acme.test' }).lean();
  expect(await executeTool(acme, kav, 'list_my_orders', {})).toEqual({ found: false });
});

test('executor: verify fields must match (date formats normalised); mismatch refuses without data', async () => {
  const u = await ashaUser();
  expect(await executeTool(acme, u, 'get_application_status', { fileNo: 'BN1234567890123' })).toEqual({ error: 'verification_required', fields: ['dob'] });
  expect(await executeTool(acme, u, 'get_application_status', { fileNo: 'BN1234567890123', dob: '1991-01-01' })).toEqual({ error: 'verification_failed' });
  const ok = await executeTool(acme, u, 'get_application_status', { fileNo: 'BN1234567890123', dob: '14/05/1990' });
  expect(ok.records[0]).toMatchObject({ status: 'Passport dispatched', accountNumber: 'XXXX9012', fileNo: 'BN1234567890123' });
  // another customer with the right DOB still sees nothing
  expect(await executeTool(acme, await benUser(), 'get_application_status', { fileNo: 'BN1234567890123', dob: '1990-05-14' })).toEqual({ found: false });
});

test('executor: public scope finds anyone\'s rows but strips other customers\' personal fields', async () => {
  const r = await executeTool(acme, await ashaUser(), 'search_lost_found', { item: 'backpack' });
  expect(r).toEqual({ found: true, count: 1, records: [{ item: 'black backpack', date: '2026-10-21', location: 'Store 4 counter' }] });
  const own = await executeTool(acme, await benUser(), 'search_lost_found', { item: 'backpack' });
  expect(own.records[0]).toMatchObject({ claimantName: 'Ben Thomas' });
  const anon = await executeTool(acme, null, 'search_lost_found', { item: 'umbrella' });
  expect(anon.found).toBe(true);
});

test(`lookup: at most ${MAX_TOOL_CALLS} tool calls per turn; RECORDS text + usedRecords`, async () => {
  let rounds = 0;
  groq.complete.mockImplementation(async (msgs, o) => {
    expect(o.tools.map((t) => t.function.name)).toContain('get_order_status');
    rounds++;
    return { content: '', message: { content: null }, toolCalls: [1, 2].map((i) => ({ id: `c${rounds}${i}`, name: 'get_order_status', args: { orderNo: 'AC-1001' } })) };
  });
  const r = await lookup(acme, await ashaUser(), [{ role: 'user', content: 'order AC-1001?' }]);
  expect(r.calls).toHaveLength(3);
  expect(rounds).toBe(2);
  expect(r.usedRecords).toBe(true);
  expect(r.text).toContain('get_order_status({"orderNo":"AC-1001"}) → {"found":true');
  groq.complete.mockReset();
  groq.complete.mockResolvedValue({ content: 'NONE', toolCalls: [], message: {} });
  expect(await lookup(acme, await ashaUser(), [{ role: 'user', content: 'how do returns work?' }])).toEqual({ calls: [], usedRecords: false, text: '' });
  groq.complete.mockRejectedValue(Object.assign(new Error('x'), { code: 'http_429' }));
  expect((await lookup(acme, await ashaUser(), [{ role: 'user', content: 'x' }])).calls).toEqual([]);
  // no tools → no Groq round at all (SmartCC)
  groq.complete.mockReset();
  expect((await lookup({ slug: 'smartcc', tools: [] }, null, [])).calls).toEqual([]);
  expect(groq.complete).not.toHaveBeenCalled();
});

// ---------- bot + assistant ----------
test('bot: tool round → answer from RECORDS → auto tier without KB source, message usedRecords, company label/attribute', async () => {
  const asha = await signIn('acme', 'asha@acme.test');
  groq.complete.mockImplementation(async (msgs, o) => {
    if (o?.tools) {
      return msgs.some((m) => m.role === 'tool') ? { content: 'NONE', toolCalls: [], message: {} }
        : { content: '', message: {}, toolCalls: [{ id: 'c1', name: 'get_order_status', args: { orderNo: 'AC-1001' } }] };
    }
    expect(msgs[0].content).toContain('first-line support assistant for Acme Retail (Retail)');
    expect(msgs[0].content).toContain('one of "orders", "returns", "payments", "stores", "general"');
    expect(msgs[1].content).toContain('RECORDS (results of lookups for THIS signed-in customer');
    expect(msgs[1].content).toContain('"status":"Shipped"');
    expect(msgs[1].content).not.toContain('4111');
    return { intent: 'order_status', category: 'orders', priority: 'low', confidence: 0.95, triggers: [], answer: 'Your order AC-1001 has shipped.', sources: [], summary: 's' };
  });
  const num = (await asha.post('/api/tickets').send({ subject: 'Order status please', description: 'What is the status of my order AC-1001 please?' }).expect(201)).body.ticket.number;
  const t = await Ticket.findOne({ number: num });
  const r = await bot.run(t._id);
  expect(r).toMatchObject({ tier: 'auto', usedRecords: true });
  const m = await until(() => Message.findOne({ ticketId: t._id, author: 'ai' }));
  expect(m.usedRecords).toBe(true);
  const msgs = (await asha.get(`/api/tickets/${num}/messages`).expect(200)).body.items;
  expect(msgs.find((x) => x.author === 'ai')).toMatchObject({ usedRecords: true, body: 'Your order AC-1001 has shipped.' });
  expect(cw.named('setLabels').at(-1)[2]).toEqual(expect.arrayContaining(['orders', 'ai-auto']));
  expect(cw.named('setCustomAttributes').at(-1)[2]).toMatchObject({ company: 'Acme Retail' });
  expect(cw.named('createMessage').map((c) => c[2]?.content ?? '').find((c) => c.includes('AI assistant'))).toContain('Checked your records');
});

test('assistant: tool round then streamed answer; sources event carries usedRecords', async () => {
  const asha = await signIn('acme', 'asha@acme.test');
  groq.complete.mockImplementation(async (msgs) => (msgs.some((m) => m.role === 'tool') ? { content: 'NONE', toolCalls: [], message: {} }
    : { content: '', message: {}, toolCalls: [{ id: 'c1', name: 'list_my_orders', args: {} }] }));
  groq.chunks = (msgs) => {
    expect(msgs[0].content).toContain('live help assistant for Acme Retail');
    expect(msgs[0].content).toContain('AC-1002');
    return ['You have 2 orders.\n<<META {"sources":[],"confidence":0.9}>>'];
  };
  const res = await asha.post('/api/assistant/chat').send({ messages: [{ role: 'user', content: 'list my orders' }] }).expect(200);
  const ev = res.text.split('\n\n').filter(Boolean).map((b) => ({ event: b.match(/^event: (\w+)/)?.[1], data: JSON.parse(b.split('data: ')[1] ?? 'null') }));
  expect(ev.find((e) => e.event === 'sources').data).toEqual({ sources: [], usedRecords: true });
  expect(ev.find((e) => e.event === 'done').data).toEqual({ suggestTicket: false });
  groq.chunks = null;
});

test('analytics: ?company= narrows to one company and lists companies for the filter', async () => {
  clearProfileCache();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => (String(url).endsWith('/api/v1/profile')
    ? new Response(JSON.stringify({ accounts: [{ id: 1, role: 'administrator' }] }), { status: 200 }) : realFetch(url, init));
  try {
    await newTicket(await signUp(app)).expect(201);   // a SmartCC ticket too
    const all = (await request(app).get('/api/admin/analytics').set('X-Chatwoot-Token', 't').expect(200)).body;
    const one = (await request(app).get('/api/admin/analytics?company=acme').set('X-Chatwoot-Token', 't').expect(200)).body;
    expect(one.company).toBe('acme');
    expect(one.companies).toEqual([{ slug: 'smartcc', name: 'SmartCC' }, { slug: 'acme', name: 'Acme Retail' }]);
    expect(one.totals.tickets).toBe(await Ticket.countDocuments({ companyId: acme._id }));
    expect(all.totals.tickets).toBe(await Ticket.countDocuments({}));
    expect(one.totals.tickets).toBeLessThan(all.totals.tickets);
  } finally { globalThis.fetch = realFetch; }
});

test('startup migration: pre-v4 documents (no companyId) join the default company; idempotent', async () => {
  const { migrateTenancy, defaultCompanyId } = await import('../../src/lib/company.js');
  await User.collection.insertOne({ name: 'Old User', email: 'old@example.com' });
  await KbArticle.collection.insertOne({ slug: 'old-article', title: 'Old article title', category: 'General', body: 'b' });
  expect(await migrateTenancy()).toMatchObject({ users: 1, kbarticles: 1 });
  const id = String(await defaultCompanyId());
  expect(String((await User.findOne({ email: 'old@example.com' }).lean()).companyId)).toBe(id);
  expect(String((await KbArticle.findOne({ slug: 'old-article' }).lean()).companyId)).toBe(id);
  expect(await migrateTenancy()).toEqual({});
});
