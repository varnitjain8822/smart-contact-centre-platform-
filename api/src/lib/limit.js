import { AppError } from './errors.js';

export function limit({ windowMs, max, key, failuresOnly = false }) {   // ponytail: in-memory, single instance; Redis when >1 instance
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, windowMs).unref();
  return (req, res, next) => {
    const k = key(req), now = Date.now(); let h = hits.get(k);
    if (!h || h.reset < now) hits.set(k, h = { n: 0, reset: now + windowMs });
    if (++h.n > max) {
      res.set('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return next(new AppError(429, 'RATE_LIMITED', 'Too many attempts, try again later'));
    }
    if (failuresOnly) res.on('finish', () => { if (res.statusCode < 400) h.n--; });   // count failed attempts only
    next();
  };
}
