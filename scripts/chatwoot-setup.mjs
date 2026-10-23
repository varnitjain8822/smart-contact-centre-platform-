// Idempotent Chatwoot setup: account/users (bootstrap.rb), API inbox, agent bot, custom attributes, labels,
// then writes CHATWOOT_* ids/tokens/secrets into root .env. Tokens are printed only as fingerprints.
// Usage (stack running): node scripts/chatwoot-setup.mjs   [CHATWOOT_PUBLIC_URL=http://localhost:3000]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const envPath = `${root}.env`;
let envText = readFileSync(envPath, 'utf8');
const env = Object.fromEntries([...envText.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map(([, k, v]) => [k, v.trim()]));
const need = ['CW_ADMIN_EMAIL', 'CW_ADMIN_PASSWORD', 'CW_AGENT_EMAIL', 'CW_AGENT_PASSWORD'].filter((k) => !env[k]);
if (need.length) { console.error(`Missing in .env: ${need.join(', ')} (run node scripts/init-env.mjs)`); process.exit(1); }

const base = process.env.CHATWOOT_PUBLIC_URL ?? 'http://localhost:3000';
const portal = env.PORTAL_INTERNAL_URL || 'http://api:4000';
const fp = (t) => `${String(t).slice(0, 4)}…(${String(t).length} chars)`;

// 1. bootstrap (account, users, installation config) inside the rails container
const passEnv = ['CW_ADMIN_EMAIL', 'CW_ADMIN_PASSWORD', 'CW_AGENT_EMAIL', 'CW_AGENT_PASSWORD', 'GROQ_API_KEY', 'GROQ_MODEL'];
const out = execFileSync('docker', ['compose', 'exec', '-T', ...passEnv.flatMap((k) => ['-e', k]),
  'rails', 'bundle', 'exec', 'rails', 'runner', '-'], {
  cwd: root, input: readFileSync(`${root}scripts/chatwoot-bootstrap.rb`), encoding: 'utf8',
  env: { ...process.env, ...Object.fromEntries(passEnv.map((k) => [k, env[k] ?? ''])) },
  stdio: ['pipe', 'pipe', 'inherit'] });
const { account_id: accountId, admin_token: adminToken } = JSON.parse(out.trim().split('\n').filter((l) => l.startsWith('{')).pop());
console.log(`account ${accountId}, admin token ${fp(adminToken)}`);

async function cw(path, method = 'GET', body) {
  const res = await fetch(`${base}/api/v1/accounts/${accountId}${path}`, { method,
    headers: { 'Content-Type': 'application/json', api_access_token: adminToken }, body: body && JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const list = (r) => (Array.isArray(r) ? r : r.payload);

// 2. API inbox
const webhookUrl = `${portal}/webhooks/chatwoot`;
let inbox = list(await cw('/inboxes')).find((i) => i.name === 'Customer Portal');
if (!inbox) { inbox = await cw('/inboxes', 'POST', { name: 'Customer Portal', channel: { type: 'api', webhook_url: webhookUrl } }); console.log('inbox created'); }
else if (inbox.webhook_url !== webhookUrl) { inbox = await cw(`/inboxes/${inbox.id}`, 'PATCH', { channel: { webhook_url: webhookUrl } }); console.log('inbox webhook_url updated'); }
else console.log('inbox exists');

// 3. agent bot
const outgoingUrl = `${portal}/bot/chatwoot`;
let bot = list(await cw('/agent_bots')).find((b) => b.name === 'SmartCC AI');
if (!bot) { bot = await cw('/agent_bots', 'POST', { name: 'SmartCC AI', description: 'Portal AI triage', outgoing_url: outgoingUrl, bot_type: 'webhook' }); console.log('agent bot created'); }
else if (bot.outgoing_url !== outgoingUrl) { bot = await cw(`/agent_bots/${bot.id}`, 'PATCH', { outgoing_url: outgoingUrl }); console.log('agent bot outgoing_url updated'); }
else console.log('agent bot exists');
const botToken = typeof bot.access_token === 'string' ? bot.access_token : bot.access_token?.token;

// 4. attach bot to inbox (idempotent upsert on Chatwoot side)
await cw(`/inboxes/${inbox.id}/set_agent_bot`, 'POST', { agent_bot: bot.id });

// 4b. inbox members: agents only see conversations of inboxes they belong to (create adds only missing ids)
await cw('/inbox_members', 'POST', { inbox_id: inbox.id, user_ids: list(await cw('/agents')).map((a) => a.id) });

// 5. conversation custom attributes
const attrs = [
  { attribute_key: 'ticket_number', attribute_display_name: 'Ticket number', attribute_display_type: 'text' },
  { attribute_key: 'sla_due_at', attribute_display_name: 'SLA due', attribute_display_type: 'date' },
  { attribute_key: 'ai_tier', attribute_display_name: 'AI tier', attribute_display_type: 'list', attribute_values: ['auto', 'draft', 'human'] },
  { attribute_key: 'ai_confidence', attribute_display_name: 'AI confidence', attribute_display_type: 'number' },
  { attribute_key: 'csat', attribute_display_name: 'CSAT', attribute_display_type: 'number' },
];
const haveAttrs = new Set(list(await cw('/custom_attribute_definitions?attribute_model=0')).map((a) => a.attribute_key));
for (const a of attrs.filter((x) => !haveAttrs.has(x.attribute_key))) {
  await cw('/custom_attribute_definitions', 'POST', { custom_attribute_definition: { ...a, attribute_model: 'conversation_attribute' } });
  console.log(`custom attribute ${a.attribute_key} created`);
}

// 6. labels
const labels = { account: '#2563EB', billing: '#059669', technical: '#7C3AED', 'commerce-trade': '#D97706',
  'compliance-gst': '#DC2626', 'logistics-orders': '#0891B2', general: '#6B7280', 'ai-auto': '#16A34A',
  'ai-draft': '#CA8A04', 'ai-human': '#EA580C', 'sla-breached': '#B91C1C' };
const haveLabels = new Set(list(await cw('/labels')).map((l) => l.title));
for (const [title, color] of Object.entries(labels).filter(([t]) => !haveLabels.has(t))) {
  await cw('/labels', 'POST', { label: { title, color, show_on_sidebar: true } });
  console.log(`label ${title} created`);
}

// 7. write .env
const values = { CHATWOOT_ACCOUNT_ID: accountId, CHATWOOT_INBOX_ID: inbox.id, CHATWOOT_ADMIN_TOKEN: adminToken,
  CHATWOOT_BOT_TOKEN: botToken, CHATWOOT_INBOX_SECRET: inbox.secret, CHATWOOT_BOT_SECRET: bot.secret };
const missing = Object.entries(values).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.error(`Chatwoot did not return: ${missing.join(', ')}`); process.exit(1); }
for (const [k, v] of Object.entries(values)) {
  const rx = new RegExp(`^#?\\s*${k}=.*$`, 'm');
  envText = rx.test(envText) ? envText.replace(rx, `${k}=${v}`) : `${envText.replace(/\n?$/, '\n')}${k}=${v}\n`;
}
writeFileSync(envPath, envText, { mode: 0o600 });
console.log(`.env updated: account ${accountId}, inbox ${inbox.id}, admin token ${fp(adminToken)}, bot token ${fp(botToken)}, ` +
  `inbox secret ${fp(inbox.secret)}, bot secret ${fp(bot.secret)}`);

// 8. verify
console.log('Next: docker compose up -d --force-recreate api   then   curl -s http://localhost:4000/healthz   (expect "chatwoot":"up")');
