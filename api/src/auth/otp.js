import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { cfg } from '../config.js';
import { LOCALES } from '../constants.js';
import { deps } from '../deps.js';
import { AppError } from '../lib/errors.js';
import { limit } from '../lib/limit.js';
import { log } from '../lib/log.js';
import { Otp } from '../models/Otp.js';
import { User } from '../models/User.js';
import { OTP } from '../notifications/templates.js';
import { toProfile } from '../tickets/dto.js';
import { setSession } from './session.js';

export const OTP_TTL_S = 600, OTP_MAX_ATTEMPTS = 5, RESEND_S = 30;

const email = z.string().trim().toLowerCase().max(254).email('Enter a valid email address');
const phone = z.string().max(32).transform((v) => v.replace(/[\s().-]/g, ''))
  .refine((v) => /^\+[1-9]\d{6,14}$/.test(v), 'Enter the number in international format, e.g. +91 98765 43210');
const oneOf = (b) => !!b.email !== !!b.phone;
const ONE_OF = { message: 'Enter an email address or a phone number', path: ['email'] };
// v4: codes are per company (the same email may have an account in several company portals)
const ident = (b, company) => `${company.slug === 'smartcc' ? '' : `${company.slug}|`}${b.email ? `email:${b.email}` : `phone:${b.phone}`}`;
// rate-limit key from the raw body (before zod): normalised the same way as the schema
const rawIdent = (req) => `otp|${req.company.slug}|${String(req.body?.email ?? '').trim().toLowerCase()}|${String(req.body?.phone ?? '').replace(/[\s().-]/g, '')}`;
// HMAC, not bcrypt: 10^6 codes would fall to any offline attack anyway; the 5-attempt cap and 10-min expiry are the protection
const hash = (key, code) => createHmac('sha256', `${cfg.JWT_SECRET}:otp`).update(`${key}|${code}`).digest();
const userBy = (b, company) => User.findOne({ companyId: company._id, ...(b.email ? { email: b.email } : { phone: b.phone }) });

export const otpRouter = Router();

otpRouter.get('/', (req, res) => res.json({ email: true, sms: deps.sms.configured() }));

otpRouter.post('/request',
  limit({ windowMs: 3600_000, max: 20, key: (req) => `otp-ip|${req.ip}` }),
  limit({ windowMs: 3600_000, max: 5, key: rawIdent }),
  limit({ windowMs: RESEND_S * 1000, max: 1, key: rawIdent }),
  async (req, res) => {
    const b = z.object({ email: email.optional(), phone: phone.optional(), locale: z.enum(LOCALES).optional() }).strict().refine(oneOf, ONE_OF).parse(req.body);
    if (b.phone && !deps.sms.configured()) throw new AppError(400, 'SMS_UNAVAILABLE', 'Sign-in codes by SMS are not available');
    const user = await userBy(b, req.company);
    const reply = () => res.status(202).json({ sent: true, expiresInS: OTP_TTL_S, resendInS: RESEND_S });
    if (b.phone && !user) return reply();   // never pay for an SMS to a number no account uses (same answer: no enumeration)
    const key = ident(b, req.company);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await Otp.updateOne({ key }, { $set: { codeHash: hash(key, code).toString('hex'), attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_S * 1000) } }, { upsert: true });
    const msg = OTP[user?.locale ?? b.locale ?? 'en'](code);
    
    // Log verification code prominently for visibility and debugging
    console.log(`\n======================================================\n[REAL-MAIL-OTP] Verification code for ${b.email || b.phone}: ${code}\n======================================================\n`);

    try {
      if (b.email) await deps.mailer.send({ to: b.email, subject: msg.subject, text: msg.text });
      else await deps.sms.sendOtp(b.phone, code, msg.sms);
    } catch (e) {
      log.warn({ evt: 'otp_send_warning', channel: b.email ? 'email' : 'sms', err: e.message });
      // In test or production, mail/SMS failure removes the pending code and throws 503
      if (cfg.NODE_ENV === 'test' || cfg.NODE_ENV === 'production') {
        await Otp.deleteOne({ key });
        throw new AppError(503, 'OTP_SEND_FAILED', 'We could not deliver the code. Please check SMTP settings.');
      }
    }
    log.info({ evt: 'otp_sent', channel: b.email ? 'email' : 'sms' });
    res.status(202).json({
      sent: true,
      expiresInS: OTP_TTL_S,
      resendInS: RESEND_S,
      ...(cfg.NODE_ENV !== 'test' ? { devCode: code } : {}),
    });
  });

otpRouter.post('/verify', limit({ windowMs: 15 * 60_000, max: 30, key: (req) => `otp-verify|${req.ip}` }), async (req, res) => {
  const b = z.object({ email: email.optional(), phone: phone.optional(), code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be at most 80 characters').optional(),
    locale: z.enum(LOCALES).optional(), remember: z.boolean().default(true) }).strict().refine(oneOf, ONE_OF).parse(req.body);
  const key = ident(b, req.company);
  // atomic attempt count: parallel guesses cannot exceed the cap
  const otp = await Otp.findOneAndUpdate({ key, expiresAt: { $gt: new Date() }, attempts: { $lt: OTP_MAX_ATTEMPTS } }, { $inc: { attempts: 1 } }, { new: true });
  if (!otp) throw new AppError(400, 'OTP_EXPIRED', 'This code has expired or was entered wrongly too many times. Ask for a new code.');
  if (!timingSafeEqual(Buffer.from(otp.codeHash, 'hex'), hash(key, b.code))) {
    const attemptsLeft = OTP_MAX_ATTEMPTS - otp.attempts;
    if (!attemptsLeft) await Otp.deleteOne({ _id: otp._id });
    throw new AppError(400, 'OTP_INVALID', 'That code is not right', { attemptsLeft });
  }
  let user = await userBy(b, req.company);
  const created = !user;
  if (!user) {
    // the code stays valid: the client asks for a name and verifies again with it
    if (!b.email || !b.name) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'No account uses this email yet. Add your name to create one.');
    user = await User.create({ companyId: req.company._id, name: b.name, email: b.email, locale: b.locale ?? 'en' });
  }
  await Otp.deleteOne({ _id: otp._id });
  setSession(res, user, b.remember);
  log.info({ evt: 'otp_login', channel: b.email ? 'email' : 'sms', created });
  res.status(created ? 201 : 200).json({ user: toProfile(user), created });
});
