// Test env (no real secrets). Must run before any src import reads config.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// `npm run eval:companies` may use real Groq: only the GROQ_* values of the root .env (never printed); plain tests never do.
const rootEnv = new URL('../../.env', import.meta.url);
const groqEnv = process.env.EVAL && existsSync(rootEnv)
  ? Object.fromEntries(Object.entries(parseEnv(readFileSync(rootEnv, 'utf8'))).filter(([k, v]) => /^GROQ_(API_KEY|URL|MODEL)$/.test(k) && v)) : {};
Object.assign(process.env, {
  NODE_ENV: 'test', MONGO_MEMORY: '1', JWT_SECRET: 'test-secret-test-secret-test-secret-123', WEB_ORIGIN: 'http://localhost:5173',
  CHATWOOT_URL: 'http://chatwoot.test', CHATWOOT_ACCOUNT_ID: '1', CHATWOOT_INBOX_ID: '7', CHATWOOT_ADMIN_TOKEN: 'admin-tok',
  CHATWOOT_BOT_TOKEN: 'bot-tok', CHATWOOT_INBOX_SECRET: 'inbox-secret', CHATWOOT_BOT_SECRET: 'bot-secret',
  CHATWOOT_TIMEOUT_MS: '200', AI_TIMEOUT_MS: process.env.EVAL ? '30000' : '200', LOG_LEVEL: 'error', GROQ_API_KEY: '',
  ...(process.env.EVAL_GROQ !== '0' && groqEnv),
  EMBED_MODEL: process.env.EVAL ? 'Xenova/multilingual-e5-small' : 'off',   // unit tests never load the model; `npm run eval` does
  UPLOAD_DIR: `${process.env.TMPDIR ?? '/tmp'}/smartcc-test-uploads-${process.pid}`,
});
