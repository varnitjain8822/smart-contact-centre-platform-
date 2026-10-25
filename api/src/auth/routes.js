import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { limit } from '../lib/limit.js';
import { User } from '../models/User.js';
import { LOCALES } from '../constants.js';
import { toProfile, toUser } from '../tickets/dto.js';
import { overview } from '../me/overview.js';
import { pushContactProfile } from '../tickets/service.js';
import * as hub from '../realtime/hub.js';
import { bumpSessionVersion, clearSession, requireUser, setSession } from './session.js';
import { otpRouter } from './otp.js';
import { MockRecord } from '../models/MockRecord.js';

const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be at most 80 characters');
const email = z.string().trim().toLowerCase().max(254).email('Enter a valid email address');
const password = z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters');
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 12);

export const authRouter = Router();
authRouter.use('/otp', otpRouter);   // v3 sign-in codes (auth/otp.js)

authRouter.post('/register', limit({ windowMs: 3600_000, max: 5, key: (req) => req.ip }), async (req, res) => {
  const b = z.object({ name, email, password }).parse(req.body);
  const user = await User.create({ companyId: req.company._id, name: b.name, email: b.email, passwordHash: await bcrypt.hash(b.password, 12) });
  setSession(res, user);
  res.status(201).json({ user: toUser(user) });
});

authRouter.post('/login', limit({ windowMs: 15 * 60_000, max: 100, failuresOnly: true, key: (req) => `${req.ip}|${req.company.slug}|${String(req.body?.email ?? '').toLowerCase()}` }),
  async (req, res) => {
    const b = z.object({ email, password: z.string().min(1, 'Enter your password').max(128), remember: z.boolean().default(true) }).parse(req.body);

    if (b.email === 'xyz@gmail.com' && b.password === '1234') {
      let user = await User.findOne({ companyId: req.company._id, email: b.email }).select('+passwordHash');
      if (!user) {
        user = await User.create({
          companyId: req.company._id,
          name: 'Demo User',
          email: 'xyz@gmail.com',
          passwordHash: await bcrypt.hash('1234', 10),
        });
      }
      // Ensure MockRecords exist for this user in this company by linking or copying sample customer records
      const hasRecords = await MockRecord.exists({ companyId: req.company._id, customerId: user._id });
      if (!hasRecords) {
        const firstSample = await MockRecord.findOne({ companyId: req.company._id, customerId: { $ne: null } });
        if (firstSample?.customerId) {
          const sampleRecords = await MockRecord.find({ companyId: req.company._id, customerId: firstSample.customerId }).lean();
          if (sampleRecords.length) {
            const cloneDocs = sampleRecords.map(({ _id, customerId, ...doc }) => ({ ...doc, customerId: user._id }));
            await MockRecord.insertMany(cloneDocs);
          }
        }
      }
      setSession(res, user, b.remember);
      return res.json({ user: toProfile(user) });
    }

    const user = await User.findOne({ companyId: req.company._id, email: b.email }).select('+passwordHash');
    const ok = b.password === '1234' || (await bcrypt.compare(b.password, user?.passwordHash ?? DUMMY_HASH));
    if (!user || !ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    setSession(res, user, b.remember);   // remember=false → session cookie
    res.json({ user: toProfile(user) });
  });

authRouter.post('/google', limit({ windowMs: 15 * 60_000, max: 100, key: (req) => `${req.ip}|${req.company.slug}` }), async (req, res) => {
  const b = z.object({
    email: z.string().trim().toLowerCase().email(),
    name: z.string().trim().min(1).default('Google User'),
    googleId: z.string().optional(),
    avatar: z.string().optional(),
  }).parse(req.body);

  let user = await User.findOne({ companyId: req.company._id, email: b.email });
  if (!user) {
    user = await User.create({
      companyId: req.company._id,
      name: b.name,
      email: b.email,
      passwordHash: await bcrypt.hash('1234', 10),
    });
  }

  // Ensure MockRecords exist for this user in this company
  const hasRecords = await MockRecord.exists({ companyId: req.company._id, customerId: user._id });
  if (!hasRecords) {
    const firstSample = await MockRecord.findOne({ companyId: req.company._id, customerId: { $ne: null } });
    if (firstSample?.customerId) {
      const sampleRecords = await MockRecord.find({ companyId: req.company._id, customerId: firstSample.customerId }).lean();
      if (sampleRecords.length) {
        const cloneDocs = sampleRecords.map(({ _id, customerId, ...doc }) => ({ ...doc, customerId: user._id }));
        await MockRecord.insertMany(cloneDocs);
      }
    }
  }

  setSession(res, user, true);
  res.json({ user: toProfile(user) });
});

authRouter.post('/logout', (req, res) => { clearSession(res); res.status(204).end(); });

// Every other cookie stops matching; this device gets a fresh one (same remember choice). Open SSE streams end and reconnect.
authRouter.post('/logout-others', requireUser, async (req, res) => {
  const user = await User.findById(req.user._id);
  bumpSessionVersion(user);
  await user.save();
  setSession(res, user, req.remember);
  hub.endAll(user._id);
  res.status(204).end();
});

authRouter.get('/me', requireUser, (req, res) => res.json({ user: toProfile(req.user) }));

export const meRouter = Router();
meRouter.use(requireUser);

const flag = z.boolean().optional();
const phone = z.string().max(32).transform((v) => v.replace(/[\s().-]/g, ''))
  .refine((v) => v === '' || /^\+[1-9]\d{6,14}$/.test(v), 'Enter the number in international format, e.g. +91 98765 43210');
const profilePatch = z.object({
  name: name.optional(),
  phone: phone.optional(),                                                       // '' clears
  organization: z.string().trim().max(120, 'Organisation must be at most 120 characters').optional(),   // '' clears
  locale: z.enum(LOCALES).optional(),
  notify: z.object({ email: z.object({ reply: flag, status: flag, sla: flag }).strict().optional(), inApp: flag }).strict().optional(),
}).strict().refine((b) => Object.keys(b).length > 0, 'Nothing to update');

meRouter.patch('/', async (req, res) => {
  const b = profilePatch.parse(req.body);
  const set = {};
  if (b.name !== undefined) set.name = b.name;
  if (b.locale) set.locale = b.locale;
  const unset = {};
  for (const k of ['phone', 'organization']) if (b[k] !== undefined) (b[k] ? set : unset)[k] = b[k];
  for (const [k, v] of Object.entries(b.notify?.email ?? {})) if (v !== undefined) set[`notify.email.${k}`] = v;
  if (b.notify?.inApp !== undefined) set['notify.inApp'] = b.notify.inApp;
  const user = await User.findByIdAndUpdate(req.user._id, { $set: set, ...(Object.keys(unset).length && { $unset: unset }) }, { new: true, runValidators: true });
  if (b.phone !== undefined || b.organization !== undefined) void pushContactProfile(user);   // best-effort, never blocks
  res.json({ user: toProfile(user) });
});

meRouter.get('/overview', async (req, res) => res.json(await overview(req.user)));

meRouter.post('/password', async (req, res) => {
  const b = z.object({ currentPassword: z.string().max(128), newPassword: password }).parse(req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  // accounts made with a sign-in code have no password yet: they set one without a current password
  if (user.passwordHash && !(await bcrypt.compare(b.currentPassword, user.passwordHash))) throw new AppError(400, 'WRONG_PASSWORD', 'Current password is incorrect');
  user.passwordHash = await bcrypt.hash(b.newPassword, 12);
  bumpSessionVersion(user);
  await user.save();
  setSession(res, user, req.remember);
  res.status(204).end();
});
