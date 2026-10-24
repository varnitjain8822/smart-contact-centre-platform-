import { cfg } from '../config.js';

/** Chatwoot inbox (+ team) for a company slug; the default company and any company without its own inbox use CHATWOOT_INBOX_ID. */
export function inboxFor(slug) {
  const c = cfg.CHATWOOT_COMPANY_INBOXES?.[slug];
  return c?.inboxId ? { inboxId: Number(c.inboxId), teamId: c.teamId ? Number(c.teamId) : undefined } : { inboxId: Number(cfg.CHATWOOT_INBOX_ID) };
}
/** [slug, inbox webhook secret] for every company inbox (each API inbox signs its webhooks with its own secret). */
export const inboxSecrets = () => Object.entries(cfg.CHATWOOT_COMPANY_INBOXES ?? {}).filter(([, c]) => c?.secret).map(([s, c]) => [s, c.secret]);
