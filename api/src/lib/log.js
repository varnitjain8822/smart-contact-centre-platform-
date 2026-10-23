import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { cfg } from '../config.js';

const als = new AsyncLocalStorage();   // carries the request id into every log line written while serving a request

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const SECRET = /authorization|api_access_token|cookie|password|token|secret/i;

export function redact(v) {
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.test(k) ? '[redacted]' : redact(x)]));
  }
  return v;
}

const write = (level) => (obj) => {
  if (LEVELS[level] < LEVELS[cfg.LOG_LEVEL]) return;
  const reqId = als.getStore();
  console.log(JSON.stringify({ level, time: new Date().toISOString(), ...(reqId && { reqId }), ...redact(obj) }));
};
export const log = { debug: write('debug'), info: write('info'), warn: write('warn'), error: write('error') };

export function requestLogger(req, res, next) {
  const given = req.get('x-request-id');
  req.id = given && /^[\w.-]{1,64}$/.test(given) ? given : randomUUID();
  res.set('X-Request-Id', req.id);
  const start = process.hrtime.bigint();
  res.on('finish', () => log.info({ method: req.method, path: req.originalUrl.split('?')[0], status: res.statusCode,
    ms: Number(process.hrtime.bigint() - start) / 1e6, userId: req.user?._id, reqId: req.id }));
  als.run(req.id, next);
}
