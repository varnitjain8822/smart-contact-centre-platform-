import * as chatwoot from './chatwoot/client.js';
import * as groq from './ai/groq.js';
import * as mailer from './notifications/mailer.js';

// Swappable integrations: createApp({chatwoot, groq, mailer}) replaces these (tests pass fakes).
export const deps = { chatwoot, groq, mailer };
