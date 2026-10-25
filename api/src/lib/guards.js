import { cfg } from '../config.js';
import { AppError } from './errors.js';

// CSRF guard for /api mutations: Origin must match WEB_ORIGIN when present; body must be JSON (multipart only for uploads).
export function mutationGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.headers.origin) {
    const origin = req.headers.origin;
    const isConfigured = origin === cfg.WEB_ORIGIN;
    let isSameHost = false;
    let isTunnel = false;
    try {
      const parsed = new URL(origin);
      const reqHost = (req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0];
      const originHostname = parsed.hostname;
      isSameHost = Boolean(reqHost && originHostname === reqHost);
      isTunnel = /\.trycloudflare\.com$|\.ngrok(-free)?\.(app|io)$/i.test(originHostname);
    } catch {
      // invalid URL
    }
    if (!isConfigured && !isSameHost && !isTunnel) {
      return next(new AppError(403, 'FORBIDDEN_ORIGIN', 'Request origin not allowed'));
    }
  }
  const upload = req.method === 'POST' && /\/(attachments|voice\/transcribe)$/.test(req.path) && req.is('multipart/form-data');   // file uploads
  if (!upload && !req.is('application/json')) return next(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json'));
  next();
}
