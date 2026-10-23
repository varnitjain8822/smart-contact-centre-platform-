import { ZodError } from 'zod';
import { log } from './log.js';

export class AppError extends Error {
  constructor(status, code, message = code, details) { super(message); this.status = status; this.code = code; this.details = details; }
}
export class ChatwootError extends Error {
  constructor(status, path, body) { super(`chatwoot ${status} ${path}`); this.status = status; this.path = path; this.body = body; }
}
export class AiError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const send = (res, status, code, message, details) =>
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });

// eslint-disable-next-line no-unused-vars
export function errorMiddleware(err, req, res, next) {
  if (err instanceof AppError) return send(res, err.status, err.code, err.message, err.details);
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return send(res, 400, 'VALIDATION_FAILED', details[0]?.message ?? 'Invalid request', details);
  }
  if (err?.code === 11000 && err.keyPattern?.email) return send(res, 409, 'EMAIL_TAKEN', 'An account with this email already exists');
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') return send(res, 400, 'VALIDATION_FAILED', 'Invalid request body');
  log.error({ evt: 'unhandled_error', path: req.path, err: err?.message, stack: err?.stack });
  return send(res, 500, 'INTERNAL', 'Something went wrong');
}
