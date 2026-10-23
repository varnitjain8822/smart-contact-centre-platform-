import * as chatwoot from './chatwoot/client.js';
import * as groq from './ai/groq.js';
import * as mailer from './notifications/mailer.js';
import * as embedder from './kb/embed.js';
import * as sms from './notifications/sms.js';
import { cfg } from './config.js';

// Swappable integrations: createApp({chatwoot, groq, mailer, sms, embedder}) replaces these (tests pass fakes). embedder null = text-only KB search.
export const deps = { chatwoot, groq, mailer, sms, embedder: cfg.EMBED_MODEL === 'off' ? null : embedder };
