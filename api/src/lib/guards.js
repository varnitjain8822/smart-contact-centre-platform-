import { cfg } from '../config.js';
import { AppError } from './errors.js';

// CSRF guard for /api mutations: Origin must match WEB_ORIGIN when present; body must be JSON (multipart only for uploads).
export function mutationGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.headers.origin && req.headers.origin !== cfg.WEB_ORIGIN) return next(new AppError(403, 'FORBIDDEN_ORIGIN', 'Request origin not allowed'));
  const upload = req.method === 'POST' && /\/(attachments|voice\/transcribe)$/.test(req.path) && req.is('multipart/form-data');   // file uploads
  if (!upload && !req.is('application/json')) return next(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json'));
  next();
}
