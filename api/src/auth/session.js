import jwt from 'jsonwebtoken';
import { cfg } from '../config.js';
import { AppError } from '../lib/errors.js';
import { User } from '../models/User.js';

const COOKIE = 'scc_session';
const pv = (user) => Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
const cookieOpts = () => ({ httpOnly: true, sameSite: 'lax', path: '/', secure: cfg.COOKIE_SECURE });

/** remember=false → browser-session cookie (no maxAge); the JWT still expires after 7 d either way. */
export function setSession(res, user, remember = true) {
  const token = jwt.sign({ sub: String(user._id), pv: pv(user), rm: remember ? 1 : 0 }, cfg.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
  res.cookie(COOKIE, token, { ...cookieOpts(), ...(remember && { maxAge: 604800 * 1000 }) });
}
export const clearSession = (res) => res.cookie(COOKIE, '', { ...cookieOpts(), maxAge: 0 });
/** pv has 1 s resolution: always move it forward so every older cookie stops matching (password change, sign out other devices). */
export const bumpSessionVersion = (user) => { user.passwordChangedAt = new Date(Math.max(Date.now(), user.passwordChangedAt.getTime() + 1000)); };

async function sessionUser(req) {
  try {
    const p = jwt.verify(req.cookies?.[COOKIE] ?? '', cfg.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(p.sub, 'name email passwordChangedAt chatwoot createdAt locale notify phone organization');
    if (!user || pv(user) !== p.pv) return null;
    req.user = user;
    req.remember = p.rm !== 0;   // tokens issued before rm existed were 7-day cookies
    return user;
  } catch { return null; }
}

export async function requireUser(req, res, next) {
  if (!(await sessionUser(req))) {
    clearSession(res);
    throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in');
  }
  next();
}
/** Public routes that personalise when signed in (KB myVote). Never clears the cookie. */
export const optionalUser = async (req, res, next) => { await sessionUser(req); next(); };
