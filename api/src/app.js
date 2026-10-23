import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import mongoose from 'mongoose';
import { cfg } from './config.js';
import { deps } from './deps.js';
import { aiRouter, assistantRouter } from './ai/routes.js';
import { attachmentsRouter } from './attachments/routes.js';
import { notificationsRouter } from './notifications/routes.js';
import { handleBotEvent } from './ai/bot.js';
import { authRouter, meRouter } from './auth/routes.js';
import { receive } from './chatwoot/signature.js';
import { handleInboxEvent } from './chatwoot/webhook.js';
import { kbRouter } from './kb/routes.js';
import { AppError, errorMiddleware } from './lib/errors.js';
import { mutationGuard } from './lib/guards.js';
import { requestLogger } from './lib/log.js';
import { streamRouter } from './realtime/routes.js';
import { ticketsRouter } from './tickets/routes.js';

let chatwootHealth = { at: 0, value: 'unknown' };   // cached 30 s

export function createApp(overrides = {}) {
  Object.assign(deps, overrides);
  const app = express();
  app.set('trust proxy', cfg.TRUST_PROXY);
  app.disable('x-powered-by');
  // JSON API + SSE + file downloads: nothing here is a document that loads sub-resources, so CSP denies everything
  app.use(helmet({
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },   // portal (vite dev on :5173) may <img> an attachment
    referrerPolicy: { policy: 'same-origin' },
    frameguard: { action: 'deny' },
  }));
  // gzip, but never SSE: compressed event streams are buffered until a chunk fills
  app.use(compression({ filter: (req, res) => !String(res.getHeader('Content-Type') ?? '').includes('text/event-stream') && compression.filter(req, res) }));
  app.use(requestLogger);

  // Webhooks: raw body BEFORE any JSON parser so the HMAC sees the exact bytes
  const raw = express.raw({ type: '*/*', limit: '1mb' });
  app.post('/webhooks/chatwoot', raw, receive(cfg.CHATWOOT_INBOX_SECRET, 'inbox', handleInboxEvent));
  app.post('/bot/chatwoot', raw, receive(cfg.CHATWOOT_BOT_SECRET, 'bot', handleBotEvent));

  app.get('/healthz', async (req, res) => {
    const mongo = mongoose.connection.readyState === 1 ? 'up' : 'down';
    if (Date.now() - chatwootHealth.at > 30_000 && deps.chatwoot.ping) {
      chatwootHealth = { at: Date.now(), value: (await deps.chatwoot.ping()) ? 'up' : 'down' };
    }
    const groq = deps.groq.configured?.() ? 'configured' : 'missing';
    res.status(mongo === 'up' ? 200 : 503).json({ ok: mongo === 'up', mongo, chatwoot: chatwootHealth.value, groq });
  });

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', mutationGuard);
  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/kb', kbRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/stream', streamRouter);
  app.use('/api/attachments', attachmentsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/assistant', assistantRouter);

  app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Not found')));
  app.use(errorMiddleware);
  return app;
}
