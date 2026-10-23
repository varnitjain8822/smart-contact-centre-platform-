import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { deps } from '../../src/deps.js';
import { Otp } from '../../src/models/Otp.js';
import { User } from '../../src/models/User.js';
import { fakeSms, setup } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, mailer, ip = 1;
beforeAll(async () => { await startDb(); ({ app, mailer } = await setup()); });
afterAll(stopDb);
beforeEach(() => { mailer.sent.length = 0; mailer.fail = null; deps.sms = fakeSms(false); vi.useRealTimers(); });

const fresh = () => `otp${Date.now()}${ip}@example.com`;
const post = (path, body, from = `10.9.0.${ip}`) => request(app).post(`/api/auth/otp/${path}`).set('X-Forwarded-For', from).send(body);
const codeIn = (m) => m.subject.match(/^(\d{6}) /)[1];

test('request → 202, email with the code (en/hi), only an HMAC stored, 10-min expiry', async () => {
  const email = fresh(); ip++;
  const r = await post('request', { email, locale: 'hi' }).expect(202);
  expect(r.body).toEqual({ sent: true, expiresInS: 600, resendInS: 30 });
  const m = mailer.sent.at(-1);
  expect(m.to).toBe(email);
  expect(m.subject).toMatch(/^\d{6} आपका SmartCC साइन-इन कोड है$/);
  expect(m.text).toMatch(/10 मिनट/);
  const otp = await Otp.findOne({ key: `email:${email}` }).lean();
  expect(otp.codeHash).not.toContain(codeIn(m));
  expect(otp.codeHash).toMatch(/^[a-f0-9]{64}$/);
  expect(otp.expiresAt.getTime() - Date.now()).toBeGreaterThan(590_000);
  const en = fresh(); ip++;
  await post('request', { email: en }).expect(202);
  expect(mailer.sent.at(-1).text).toMatch(/expires in 10 minutes/);
});

test('register by code: unknown email without name → 404 (code kept) → with name → 201 + session; then sign in by code', async () => {
  const email = fresh(); ip++;
  await post('request', { email }).expect(202);
  const code = codeIn(mailer.sent.at(-1));
  expect((await post('verify', { email, code }).expect(404)).body.error.code).toBe('ACCOUNT_NOT_FOUND');
  const agent = request.agent(app);
  const r = await agent.post('/api/auth/otp/verify').set('X-Forwarded-For', `10.9.0.${ip}`).send({ email, code, name: 'Code User', locale: 'hi' }).expect(201);
  expect(r.body).toMatchObject({ created: true, user: { email, name: 'Code User', locale: 'hi' } });
  expect((await agent.get('/api/auth/me').expect(200)).body.user.email).toBe(email);
  expect(await Otp.countDocuments({ key: `email:${email}` })).toBe(0);                     // single use
  expect((await post('verify', { email, code }).expect(400)).body.error.code).toBe('OTP_EXPIRED');
  // no password yet: password login fails, setting one needs no current password
  await request(app).post('/api/auth/login').send({ email, password: 'whatever-123' }).expect(401);
  await agent.post('/api/me/password').send({ currentPassword: '', newPassword: 'n3w-password' }).expect(204);
  // sign in again by code (existing account) → 200, remember=false → session cookie
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.now() + 31_000);                                               // past the 30 s resend cooldown
  await post('request', { email }).expect(202);
  const again = await post('verify', { email, code: codeIn(mailer.sent.at(-1)), remember: false }).expect(200);
  expect(again.body.created).toBe(false);
  expect(again.headers['set-cookie'][0]).not.toMatch(/Max-Age/i);
});

test('5 wrong attempts → code burned (OTP_EXPIRED even with the right code); attemptsLeft counts down', async () => {
  const email = fresh(); ip++;
  await User.create({ name: 'Guess Me', email });
  await post('request', { email }).expect(202);
  const code = codeIn(mailer.sent.at(-1));
  const wrong = code === '000000' ? '111111' : '000000';
  for (let left = 4; left >= 0; left--) {
    const r = await post('verify', { email, code: wrong }).expect(400);
    expect(r.body.error).toMatchObject({ code: 'OTP_INVALID', details: { attemptsLeft: left } });
  }
  expect((await post('verify', { email, code }).expect(400)).body.error.code).toBe('OTP_EXPIRED');
});

test('expired after 10 minutes', async () => {
  const email = fresh(); ip++;
  await User.create({ name: 'Late User', email });
  await post('request', { email }).expect(202);
  const code = codeIn(mailer.sent.at(-1));
  await Otp.updateOne({ key: `email:${email}` }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  expect((await post('verify', { email, code }).expect(400)).body.error.code).toBe('OTP_EXPIRED');
});

test('rate limits: resend after 30 s per email, 5/h per email, 20/h per IP', async () => {
  const email = fresh(); ip++;
  await post('request', { email }).expect(202);
  const r = await post('request', { email }).expect(429);
  expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
  const from = '10.8.8.8';
  for (let i = 0; i < 20; i++) await post('request', { email: `ipcap${i}${Date.now()}@example.com` }, from).expect(202);
  expect((await post('request', { email: fresh() }, from).expect(429)).body.error.code).toBe('RATE_LIMITED');
});

test('validation: exactly one of email/phone, 6-digit code; send failure → 503 and no code left', async () => {
  ip++;
  await post('request', {}).expect(400);
  await post('request', { email: fresh(), phone: '+919876543210' }).expect(400);
  await post('verify', { email: fresh(), code: '12ab56' }).expect(400);
  mailer.fail = new Error('smtp down');
  const email = fresh();
  expect((await post('request', { email }).expect(503)).body.error.code).toBe('OTP_SEND_FAILED');
  expect(await Otp.countDocuments({ key: `email:${email}` })).toBe(0);
});

test('phone: hidden/refused when SMS is off; when on, sends only to a known number and signs in', async () => {
  ip++;
  expect((await request(app).get('/api/auth/otp').expect(200)).body).toEqual({ email: true, sms: false });
  expect((await post('request', { phone: '+91 98765 43210' }).expect(400)).body.error.code).toBe('SMS_UNAVAILABLE');
  deps.sms = fakeSms(true);
  expect((await request(app).get('/api/auth/otp').expect(200)).body.sms).toBe(true);
  const phone = `+9198${String(Date.now()).slice(-8)}`;
  await post('request', { phone }).expect(202);
  expect(deps.sms.sent).toHaveLength(0);                                              // unknown number: no SMS, same answer
  await post('request', { phone }).expect(429);                                       // resend cooldown applies to phones too
  const known = `+9197${String(Date.now()).slice(-8)}`;
  await User.create({ name: 'Phone User', email: fresh(), phone: known, locale: 'hi' });
  await post('request', { phone: known }).expect(202);
  const s = deps.sms.sent.at(-1);
  expect(s).toMatchObject({ phone: known });
  expect(s.text).toContain(s.code);
  expect(s.text).toMatch(/साइन-इन कोड/);
  const r = await post('verify', { phone: known, code: s.code }).expect(200);
  expect(r.body.user.phone).toBe(known);
});
