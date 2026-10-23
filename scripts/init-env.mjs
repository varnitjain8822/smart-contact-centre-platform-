// Creates/completes root .env and chatwoot/.env. Idempotent: existing values are never replaced.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const alnum = (n) => randomBytes(n * 2).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, n);
const hex = (bytes) => randomBytes(bytes).toString('hex');

const get = (text, key) => text.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? null;
function set(text, key, value) {
  const rx = new RegExp(`^#?\\s*${key}=.*$`, 'm');
  return rx.test(text) ? text.replace(rx, `${key}=${value}`) : `${text.replace(/\n?$/, '\n')}${key}=${value}\n`;
}

function update(path, examplePath, fill) {
  const before = existsSync(path) ? readFileSync(path, 'utf8') : null;
  let text = before ?? readFileSync(examplePath, 'utf8');
  if (before !== null) {                         // add keys that appeared in the example since last run
    for (const [, k, v] of readFileSync(examplePath, 'utf8').matchAll(/^([A-Z0-9_]+)=(.*)$/gm)) if (get(text, k) === null) text = set(text, k, v);
  }
  text = fill(text);
  if (text !== before) { writeFileSync(path, text, { mode: 0o600 }); console.log(`${before === null ? 'created' : 'updated'} ${path}`); }
  else console.log(`unchanged ${path}`);
}

const ifEmpty = (text, key, gen, placeholder) => {
  const v = get(text, key); return v && v !== placeholder ? text : set(text, key, gen());
};

update(`${root}.env`, `${root}.env.example`, (t) => {
  t = ifEmpty(t, 'JWT_SECRET', () => alnum(48));
  t = ifEmpty(t, 'CW_ADMIN_PASSWORD', () => `${alnum(20)}Aa1!`);   // Chatwoot requires upper, lower, digit, symbol
  t = ifEmpty(t, 'CW_AGENT_PASSWORD', () => `${alnum(20)}Aa1!`);
  t = ifEmpty(t, 'MONGO_ROOT_PASSWORD', () => alnum(32));          // alnum: safe inside mongodb:// URLs
  t = ifEmpty(t, 'MONGO_APP_PASSWORD', () => alnum(32));
  t = ifEmpty(t, 'UNSUBSCRIBE_SECRET', () => alnum(48));
  return t;
});

update(`${root}chatwoot/.env`, `${root}chatwoot/.env.example`, (t) => {
  t = ifEmpty(t, 'SECRET_KEY_BASE', () => hex(64), 'replace_with_lengthy_secure_hex');
  t = ifEmpty(t, 'REDIS_PASSWORD', () => hex(16));
  for (const [k, v] of Object.entries({ FRONTEND_URL: 'http://localhost:3000', ENABLE_ACCOUNT_SIGNUP: 'false',
    SAFE_FETCH_ALLOW_PRIVATE_NETWORK: 'true', POSTGRES_HOST: 'postgres', REDIS_URL: 'redis://redis:6379' })) {
    if (get(t, k) !== v) t = set(t, k, v);
  }
  return t;
});
