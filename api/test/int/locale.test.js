import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import * as bot from '../../src/ai/bot.js';
import { topArticles } from '../../src/kb/retrieve.js';
import { KbTranslation } from '../../src/models/KbTranslation.js';
import { Message } from '../../src/models/Message.js';
import { Ticket } from '../../src/models/Ticket.js';
import { ARTICLES, ARTICLES_HI } from '../../src/seed/kb.js';
import { newTicket, setup, signUp } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

let app, groq, h;
beforeAll(async () => { await startDb(); ({ app, groq } = await setup()); h = await signUp(app, 'Anita Verma'); });
afterAll(stopDb);
beforeEach(() => { groq.out = null; groq.fail = null; });

test('profile: locale + notify returned by /auth/me and PATCH /api/me; locale validated', async () => {
  const me = (await h.get('/api/auth/me').expect(200)).body.user;
  expect(me).toMatchObject({ locale: 'en', notify: { email: { reply: true, status: true, sla: true }, inApp: true } });
  const p = (await h.patch('/api/me').send({ locale: 'hi' }).expect(200)).body.user;
  expect(p).toMatchObject({ name: 'Anita Verma', locale: 'hi' });
  await h.patch('/api/me').send({ locale: 'fr' }).expect(400);
  expect((await h.get('/api/auth/me').expect(200)).body.user.locale).toBe('hi');
});

test('every seed article has a natural Hindi translation (Devanagari title and body)', () => {
  expect(ARTICLES_HI).toHaveLength(ARTICLES.length);
  for (const t of ARTICLES_HI) {
    expect(t.title).toMatch(/[ऀ-ॿ]/);
    expect(t.body).toMatch(/[ऀ-ॿ]/);
    expect(t.title.length).toBeLessThanOrEqual(140);
  }
});

test('KB: ?locale=hi lists/serves Hindi with same slugs; Hindi and English queries both find Hindi articles; missing translation falls back to English', async () => {
  const en = (await request(app).get('/api/kb/articles').expect(200)).body.items;
  const hi = (await request(app).get('/api/kb/articles?locale=hi').expect(200)).body.items;
  expect(hi.map((a) => a.slug).sort()).toEqual(en.map((a) => a.slug).sort());
  expect(hi.find((a) => a.slug === 'refund-status').title).toBe('रिफ़ंड का स्टेटस और पैसे वापस आने का समय');
  expect((await request(app).get('/api/kb/articles/refund-status?locale=hi').expect(200)).body.article).toMatchObject({ locale: 'hi', body: expect.stringMatching(/5–7 कामकाजी दिनों/) });
  expect((await request(app).get('/api/kb/articles/refund-status?locale=xx').expect(200)).body.article.locale).toBe('en');
  expect((await request(app).get(`/api/kb/articles?locale=hi&q=${encodeURIComponent('रिफ़ंड')}`).expect(200)).body.items[0].slug).toBe('refund-status');
  expect((await request(app).get('/api/kb/articles?locale=hi&q=invoice').expect(200)).body.items[0]).toMatchObject({ slug: 'invoice-gst-receipt-download', title: expect.stringMatching(/इनवॉइस/) });
  expect((await request(app).get(`/api/kb/articles?locale=en&q=${encodeURIComponent('रिफ़ंड')}`).expect(200)).body.items).toEqual([]);
  expect((await topArticles('पासवर्ड भूल गए', 3, 'hi'))[0]).toMatchObject({ slug: 'password-reset', locale: 'hi' });
  await KbTranslation.deleteOne({ slug: 'otp-not-received' });
  const otp = (await request(app).get('/api/kb/articles/otp-not-received?locale=hi').expect(200)).body.article;
  expect(otp).toMatchObject({ locale: 'en', title: 'Login Verification Code (OTP) Not Received' });
});

test('ticket captures the customer locale; bot prompt says "Reply in Hindi", retrieves Hindi articles, Hindi system messages', async () => {
  const r = await newTicket(h).expect(201);
  const t = await Ticket.findOne({ number: r.body.ticket.number });
  expect(t.locale).toBe('hi');
  groq.out = { intent: 'x', category: 'Billing', priority: 'medium', confidence: 0.3, triggers: [], answer: '', sources: [], summary: 's' };
  await Ticket.updateOne({ _id: t._id }, { $set: { 'ai.pendingSince': new Date() } });
  expect((await bot.run(t._id)).tier).toBe('human');
  expect(groq.last[0].content).toContain('LANGUAGE: Reply in Hindi');
  expect(groq.last[1].content).toContain('[slug: payment-pending-subscription-not-active] पेमेंट पेंडिंग है');
  expect((await Message.findOne({ ticketId: t._id, author: 'system' })).body).toBe('हमने आपका मामला हमारी सपोर्ट टीम को भेज दिया है। एजेंट यहीं जवाब देंगे।');

  const r2 = await newTicket(h).expect(201);
  const m = (await h.post(`/api/tickets/${r2.body.ticket.number}/handoff`).send({}).expect(200));
  void m;
  const sys = await Message.findOne({ ticketId: (await Ticket.findOne({ number: r2.body.ticket.number }))._id, author: 'system' });
  expect(sys.body).toBe('आपने किसी व्यक्ति से बात करने को कहा है। एजेंट यहीं जवाब देंगे।');

  const e = await signUp(app, 'English User');
  const te = await Ticket.findOne({ number: (await newTicket(e).expect(201)).body.ticket.number });
  expect(te.locale).toBe('en');
  await Ticket.updateOne({ _id: te._id }, { $set: { 'ai.pendingSince': new Date() } });
  await bot.run(te._id);
  expect(groq.last[0].content).toContain('LANGUAGE: Reply in English');
});

test('suggest follows the user locale', async () => {
  groq.out = { intent: 'x', category: 'Billing', priority: 'low', confidence: 0.8, triggers: [], answer: 'ठीक है', sources: ['payment-pending-subscription-not-active'], summary: '' };
  const r = await h.post('/api/ai/suggest').send({ subject: 'Payment', description: 'I paid yesterday and my plan is still inactive.' }).expect(200);
  expect(groq.last[0].content).toContain('Reply in Hindi');
  expect(r.body.sources[0].title).toBe('पेमेंट पेंडिंग है / सब्सक्रिप्शन चालू नहीं हुआ');
});
