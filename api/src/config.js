import { z } from 'zod';

const num = (d) => z.coerce.number().default(d);
const bool = z.enum(['true', 'false', '1', '0']).default('false').transform((v) => v === 'true' || v === '1');
const req = z.string().trim().min(1);
const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: num(4000),
  MONGO_URL: opt,
  MONGO_MEMORY: bool,
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  COOKIE_SECURE: bool,
  WEB_ORIGIN: req,
  TRUST_PROXY: num(1),
  CHATWOOT_URL: req,
  CHATWOOT_ACCOUNT_ID: req,
  CHATWOOT_INBOX_ID: req,
  CHATWOOT_ADMIN_TOKEN: req,
  CHATWOOT_BOT_TOKEN: req,
  CHATWOOT_INBOX_SECRET: req,
  CHATWOOT_BOT_SECRET: req,
  CHATWOOT_TIMEOUT_MS: num(10000),
  // v4: per-company Chatwoot inbox, written by scripts/chatwoot-setup.mjs: {"<slug>":{"inboxId":12,"teamId":3,"secret":"…"}}
  CHATWOOT_COMPANY_INBOXES: z.string().default('{}').transform((s, ctx) => {
    try { return JSON.parse(s); } catch { ctx.addIssue({ code: 'custom', message: 'must be JSON' }); return z.NEVER; }
  }),
  CHATWOOT_INLINE_MS: num(1500),
  GROQ_API_KEY: opt,
  GROQ_URL: z.string().default('https://api.groq.com/openai/v1'),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),
  AI_TIMEOUT_MS: num(20000),
  AI_AUTO_THRESHOLD: num(0.85),
  AI_DRAFT_THRESHOLD: num(0.6),
  AI_MAX_AUTO_REPLIES: num(2),
  SLA_AT_RISK_RATIO: num(0.25),
  SYNC_INTERVAL_MS: num(30000),
  WEBHOOK_TOLERANCE_S: num(300),
  UPLOAD_DIR: z.string().default('/data/uploads'),
  SMTP_URL: z.string().default('smtp://mailhog:1025'),
  SMTP_HOST: opt,
  SMTP_PORT: num(587),
  SMTP_USER: opt,
  SMTP_PASS: opt,
  SMTP_SECURE: bool,
  MAIL_FROM: z.string().default('SmartCC Support <support@smartcc.localhost>'),
  SHUTDOWN_GRACE_MS: num(10000),
  EMBED_MODEL: z.string().default('Xenova/multilingual-e5-small'),   // 'off' → text-only KB retrieval
  EMBED_CACHE_DIR: opt,
  SMS_PROVIDER: z.enum(['msg91', 'twilio']).optional(),          // unset → no SMS sign-in codes
  MSG91_AUTH_KEY: opt,
  MSG91_TEMPLATE_ID: opt,
  TWILIO_ACCOUNT_SID: opt,
  TWILIO_AUTH_TOKEN: opt,
  TWILIO_FROM: opt,
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Empty strings (from compose env_file) count as unset so defaults apply.
const env = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
const r = schema.safeParse(env);
const problems = r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}${i.code === 'invalid_type' ? '' : ` (${i.message})`}`);
if (r.success && !r.data.MONGO_URL && !r.data.MONGO_MEMORY) problems.push('MONGO_URL');
if (r.success && r.data.MONGO_MEMORY && r.data.NODE_ENV === 'production') problems.push('MONGO_MEMORY (not allowed when NODE_ENV=production)');
if (problems.length) {
  console.error(`Invalid or missing environment variables: ${problems.join(', ')}`);
  process.exit(1);
}

export const cfg = r.data;
