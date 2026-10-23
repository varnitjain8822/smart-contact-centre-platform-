import { spawnSync } from 'node:child_process';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { expect, test, vi } from 'vitest';
import { limit } from '../../src/lib/limit.js';
import { mutationGuard } from '../../src/lib/guards.js';
import { AppError, errorMiddleware } from '../../src/lib/errors.js';
import { log, redact } from '../../src/lib/log.js';

const app = express();
app.use(express.json());
app.post('/lim', limit({ windowMs: 60000, max: 2, key: () => 'k' }), (req, res) => res.json({ ok: 1 }));
app.post('/g', mutationGuard, (req, res) => res.json({ ok: 1 }));
app.get('/app', () => { throw new AppError(409, 'INVALID_STATE', 'nope', { status: 'resolved' }); });
app.get('/zod', () => z.object({ subject: z.string().min(5, 'Subject must be at least 5 characters') }).parse({ subject: 'x' }));
app.get('/dup', () => { throw Object.assign(new Error('E11000'), { code: 11000, keyPattern: { email: 1 } }); });
app.get('/boom', () => { throw new Error('secret stack'); });
app.use(errorMiddleware);

test('limiter 429 with Retry-After on max+1', async () => {
  await request(app).post('/lim').expect(200);
  await request(app).post('/lim').expect(200);
  const r = await request(app).post('/lim').expect(429);
  expect(r.body.error.code).toBe('RATE_LIMITED');
  expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
});

test('guard 415 / 403', async () => {
  expect((await request(app).post('/g').set('Content-Type', 'text/plain').send('x').expect(415)).body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  expect((await request(app).post('/g').set('Origin', 'http://evil.test').send({}).expect(403)).body.error.code).toBe('FORBIDDEN_ORIGIN');
  await request(app).post('/g').set('Origin', 'http://localhost:5173').send({}).expect(200);
  await request(app).post('/g').send({}).expect(200);
});

test('error mapping', async () => {
  expect((await request(app).get('/app').expect(409)).body).toEqual({ error: { code: 'INVALID_STATE', message: 'nope', details: { status: 'resolved' } } });
  expect((await request(app).get('/zod').expect(400)).body).toEqual({ error: { code: 'VALIDATION_FAILED',
    message: 'Subject must be at least 5 characters', details: [{ path: 'subject', message: 'Subject must be at least 5 characters' }] } });
  expect((await request(app).get('/dup').expect(409)).body.error.code).toBe('EMAIL_TAKEN');
  const r = await request(app).get('/boom').expect(500);
  expect(r.body).toEqual({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
});

test('logger redacts token/secret keys (F11)', () => {
  expect(redact({ botToken: 'x', inbox_secret: 'y', tokenCount: 3, n: 1 })).toEqual({ botToken: '[redacted]', inbox_secret: '[redacted]', tokenCount: '[redacted]', n: 1 });
});

test('logger redacts secrets', () => {
  expect(redact({ headers: { Authorization: 'b', api_access_token: 't', cookie: 'c' }, password: 'p', newPassword: 'n', ok: [{ x: 1 }] }))
    .toEqual({ headers: { Authorization: '[redacted]', api_access_token: '[redacted]', cookie: '[redacted]' }, password: '[redacted]', newPassword: '[redacted]', ok: [{ x: 1 }] });
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  log.error({ password: 'hunter2' });
  expect(spy.mock.calls[0][0]).not.toContain('hunter2');
  spy.mockRestore();
});

test('config: missing JWT_SECRET exits non-zero listing names; MONGO_MEMORY refused in production', () => {
  const run = (env) => spawnSync(process.execPath, ['-e', "import('./src/config.js')"], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });
  const r = run({ MONGO_URL: 'mongodb://x' });
  expect(r.status).toBe(1);
  expect(r.stderr).toMatch(/JWT_SECRET/);
  expect(r.stderr).toMatch(/CHATWOOT_BOT_SECRET/);
  const full = { JWT_SECRET: 'x'.repeat(32), WEB_ORIGIN: 'o', CHATWOOT_URL: 'u', CHATWOOT_ACCOUNT_ID: '1', CHATWOOT_INBOX_ID: '1',
    CHATWOOT_ADMIN_TOKEN: 't', CHATWOOT_BOT_TOKEN: 't', CHATWOOT_INBOX_SECRET: 's', CHATWOOT_BOT_SECRET: 's' };
  expect(run({ ...full, MONGO_MEMORY: '1', NODE_ENV: 'production' }).stderr).toMatch(/MONGO_MEMORY/);
  expect(run({ ...full }).stderr).toMatch(/MONGO_URL/);
  const ok = spawnSync(process.execPath, ['--input-type=module', '-e', "const {cfg}=await import('./src/config.js'); console.log(JSON.stringify(cfg))"],
    { env: { PATH: process.env.PATH, ...full, MONGO_URL: 'm', PORT: '' }, encoding: 'utf8' });
  expect(ok.status).toBe(0);
  expect(JSON.parse(ok.stdout)).toMatchObject({ PORT: 4000, TRUST_PROXY: 1, CHATWOOT_TIMEOUT_MS: 10000, AI_AUTO_THRESHOLD: 0.85,
    AI_DRAFT_THRESHOLD: 0.6, AI_MAX_AUTO_REPLIES: 2, SLA_AT_RISK_RATIO: 0.25, SYNC_INTERVAL_MS: 30000, WEBHOOK_TOLERANCE_S: 300,
    LOG_LEVEL: 'info', COOKIE_SECURE: false, MONGO_MEMORY: false, GROQ_MODEL: 'openai/gpt-oss-120b', AI_TIMEOUT_MS: 20000 });
});
