import request from 'supertest';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { setup } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app;
beforeAll(async () => { await startDb(); ({ app } = await setup()); });
afterAll(stopDb);

const cookieOf = (r) => r.headers['set-cookie']?.find((c) => c.startsWith('scc_session='));

test('register → 201 + HttpOnly SameSite=Lax cookie → me', async () => {
  const a = request.agent(app);
  const r = await a.post('/api/auth/register').set('X-Forwarded-For', '1.1.1.1')
    .send({ name: 'Priya Shah', email: 'Priya@Example.com', password: 's3cure-pass' }).expect(201);
  expect(r.body.user).toMatchObject({ name: 'Priya Shah', email: 'priya@example.com' });
  expect(Object.keys(r.body.user).sort()).toEqual(['createdAt', 'email', 'id', 'name']);
  const c = cookieOf(r);
  expect(c).toMatch(/HttpOnly/); expect(c).toMatch(/SameSite=Lax/); expect(c).toMatch(/Path=\//); expect(c).toMatch(/Max-Age=604800/);
  expect((await a.get('/api/auth/me').expect(200)).body.user.email).toBe('priya@example.com');
});

test('duplicate email → 409 EMAIL_TAKEN; validation → 400', async () => {
  const r = await request(app).post('/api/auth/register').set('X-Forwarded-For', '1.1.1.2')
    .send({ name: 'P2', email: 'priya@example.com', password: 's3cure-pass' }).expect(409);
  expect(r.body.error.code).toBe('EMAIL_TAKEN');
  const v = await request(app).post('/api/auth/register').set('X-Forwarded-For', '1.1.1.2').send({ name: 'P', email: 'x', password: '1' }).expect(400);
  expect(v.body.error.code).toBe('VALIDATION_FAILED');
  expect(v.body.error.details.map((d) => d.path)).toEqual(['name', 'email', 'password']);
});

test('login wrong → 401 INVALID_CREDENTIALS (same for unknown); 11th attempt → 429', async () => {
  const send = (email, password = 'wrong-pass') => request(app).post('/api/auth/login').set('X-Forwarded-For', '2.2.2.2').send({ email, password });
  expect((await send('nobody@example.com').expect(401)).body.error.code).toBe('INVALID_CREDENTIALS');
  for (let i = 0; i < 10; i++) await send('priya@example.com').expect(401);
  const r = await send('priya@example.com').expect(429);
  expect(r.body.error.code).toBe('RATE_LIMITED');
  expect(r.headers['retry-after']).toBeTruthy();
  await request(app).post('/api/auth/login').set('X-Forwarded-For', '3.3.3.3').send({ email: 'priya@example.com', password: 's3cure-pass' }).expect(200);
});

test('F8: successful logins do not count toward the 10-failed-attempts limit', async () => {
  const send = (password) => request(app).post('/api/auth/login').set('X-Forwarded-For', '2.2.2.9').send({ email: 'priya@example.com', password });
  for (let i = 0; i < 10; i++) await send('s3cure-pass').expect(200);
  for (let i = 0; i < 10; i++) await send('wrong-pass').expect(401);
  await send('wrong-pass').expect(429);
});

test('register limited to 5/h/ip', async () => {
  for (let i = 0; i < 5; i++) {
    await request(app).post('/api/auth/register').set('X-Forwarded-For', '4.4.4.4').send({ name: 'Rate', email: `r${i}@example.com`, password: 's3cure-pass' }).expect(201);
  }
  await request(app).post('/api/auth/register').set('X-Forwarded-For', '4.4.4.4').send({ name: 'Rate', email: 'r9@example.com', password: 's3cure-pass' }).expect(429);
});

test('profile name; password change invalidates old cookie; logout clears cookie', async () => {
  const a = request.agent(app);
  await a.post('/api/auth/login').set('X-Forwarded-For', '5.5.5.5').send({ email: 'priya@example.com', password: 's3cure-pass' }).expect(200);
  const old = request.agent(app);
  await old.post('/api/auth/login').set('X-Forwarded-For', '5.5.5.6').send({ email: 'priya@example.com', password: 's3cure-pass' }).expect(200);
  expect((await a.patch('/api/me').send({ name: 'Priya S.' }).expect(200)).body.user.name).toBe('Priya S.');
  expect((await a.post('/api/me/password').send({ currentPassword: 'nope-nope', newPassword: 'new-pass-123' }).expect(400)).body.error.code).toBe('WRONG_PASSWORD');
  const r = await a.post('/api/me/password').send({ currentPassword: 's3cure-pass', newPassword: 'new-pass-123' }).expect(204);
  expect(cookieOf(r)).toBeTruthy();
  await a.get('/api/auth/me').expect(200);                       // new cookie works
  const stale = await old.get('/api/auth/me').expect(401);        // pv mismatch
  expect(stale.body.error.code).toBe('UNAUTHENTICATED');
  const out = await a.post('/api/auth/logout').send({}).expect(204);
  expect(cookieOf(out)).toMatch(/scc_session=;.*Max-Age=0/);
  await a.get('/api/auth/me').expect(401);
});

test('mutation guards: foreign Origin 403, non-JSON 415', async () => {
  expect((await request(app).post('/api/auth/login').set('Origin', 'http://evil.test').send({}).expect(403)).body.error.code).toBe('FORBIDDEN_ORIGIN');
  expect((await request(app).post('/api/auth/logout').set('Content-Type', 'text/plain').send('x').expect(415)).body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  const h = await request(app).get('/api/kb/articles').expect(200);
  expect(h.headers['x-content-type-options']).toBe('nosniff');
  expect(h.headers['x-frame-options']).toBe('DENY');
  expect((await request(app).get('/api/nope').expect(404)).body.error.code).toBe('NOT_FOUND');
});
