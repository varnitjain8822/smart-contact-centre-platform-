# Code Review (Stage 9) — Smart Contact Center v3

Scope: `api/`, `web/src`, `scripts/`, `docker-compose.yml`, `docker/`, Chatwoot fork diff (`git -C chatwoot diff` + untracked `PortalTicketPanel.vue` and its spec). Checked against requirements.md, lld-backend.md, lld-frontend.md, lld.md.
Severity: 🔴 P0/P1 blocking · 🟡 P2 should-fix · 🟢 P3 nit.

## 1. Traceability gap scan
- REQ-049 had an empty Code column: the fork edits were not traced. **Fixed.** It is now filled from the fork diff.
- REQ-031 and REQ-033 now also list the fork files (PortalTicketPanel/ContactPanel, installation_config.yml, brand assets).
- All 49 rows now have Code coverage. The Test column is left for Stage 10.

## 2. Architecture
The design fits the HLD and LLD:
- One Express 5 API, Mongo as the source of truth for the portal, and Chatwoot reached only through its API, webhooks and bot hook.
- An in-process worker handles retries, bot recovery and SLA sweeps.
- The fork diff stays inside the REQ-049 boundary: branding, one sidebar panel and the installation config. The compose overlay leaves the upstream file untouched.

The FE↔BE contract matches lld.md §1–§3. Checked items:
- `{ticket}` cache shape with `select`
- `useMessages` returning `r.items`
- `upsertMessage` replacing by id or clientMessageId
- `Retry-After` header
- 401 handling that excludes `['me']`
- the JSON body requirement for mutations

No contract drift was found.

Positive callouts (🎉):
- Webhook HMAC uses `timingSafeEqual` with a length check, ±300 s freshness and per-delivery dedupe.
- Bcrypt runs against a dummy hash when the email is unknown, which removes the timing difference.
- The JWT `pv` claim revokes old sessions on password change.
- Every ticket read and action goes through `getForUser(customerId)`, so there is no IDOR.
- The Origin guard and the JSON-only check cover CSRF together with SameSite=Lax.
- Optimistic concurrency on `chatwoot.lastEventAt` drops stale webhooks.
- Setup scripts print only token fingerprints.

## 3. Findings

| # | Sev | File:line | Finding | Status |
|---|---|---|---|---|
| F1 | 🔴 P1 | api/src/tickets/service.js:63, :112-115 (was `nextAttemptAt: now`) | **Duplicate tickets and messages sent to Chatwoot.** `create()` and `addCustomerMessage()` saved rows as `pending` with `nextAttemptAt: now`, then called Chatwoot inline. A worker tick inside that window (up to `CHATWOOT_TIMEOUT_MS`) picked up the same row and sent it again. The result was a second conversation (the code even logged `possible_duplicate_conversation`) or a duplicated customer message in the agent workspace. This violates REQ-046 ("never create duplicate messages"). | **Fixed.** Rows that get an inline attempt are hidden from the worker for one backoff (30 s) via `afterInline(now)`. A failed inline attempt still reschedules through `markRetry`/`markMsgRetry`. Messages on unsynced tickets keep `now`, because the worker sends them right after it syncs the ticket. Test: `tickets.test.js` "inline Chatwoot attempt in flight → worker tick does not send the same ticket/message again" (fails without the fix). |
| F2 | 🔴 P1 | api/src/tickets/service.js:249-253 (`applyConversationState`, leaving resolved) | **A reopened ticket could get stuck with no AI answer and no human.** A customer reply on a resolved ticket makes Chatwoot set the conversation to `pending`. That emits an inbox `conversation_status_changed` and an agent-bot `message_created`, from separate Sidekiq jobs with no guaranteed order. If the bot webhook ran first, `bot.run` saw the local status still `resolved` and cleared `pendingSince`. The status webhook then moved the ticket to `ai_handling` with `pendingSince = null`, so the recovery sweep never picked it up. The ticket sat in AI handling forever (REQ-012/016), and Chatwoot `pending` hides it from agents' open queue. | **Fixed.** On resolved → `ai_handling`, set `ai.pendingSince = now`. The sweep answers within 60–90 s if the bot run was skipped. Test: `webhook.test.js` "reopen resolved → pending (bot) sets ai.pendingSince…" (fails without the fix). Known limit: in the race case the latency is the sweep interval, not REQ-041's 15 s. |
| F3 | 🔴 P1 | docker/chatwoot.override.yml (with chatwoot/docker-compose.yaml:88-89) | **Passwordless Chatwoot Postgres was published on 0.0.0.0:5432.** The overlay sets `POSTGRES_HOST_AUTH_METHOD=trust`, and upstream publishes `5432:5432`. Anyone on the LAN could connect as `postgres` without a password and read or alter every conversation, contact and agent token. | **Fixed.** Added `ports: !reset []` to the postgres service in the overlay. Rails reaches it over the compose network. Requires Compose ≥ 2.24; installed is 5.6.0. Not validated with `docker compose config`, because docker commands were off-limits during the concurrent build. Run that once the build finishes. |
| F4 | 🟡 P2 | api/src/chatwoot/signature.js:31-39 | The delivery id is recorded and 200 is returned **before** the handler runs. If the handler throws (Mongo blip, bug), the event is lost and a Chatwoot retry is deduped. Recovery depends on reconcile, which only runs when the customer opens the thread (REQ-045) and only covers outgoing messages and state. Could the delivery row be written after the handler succeeds, or removed on handler failure? | **Fixed.** On handler error the `WebhookDelivery` row is deleted (`signature.js`), so a resend of that delivery is processed. Chatwoot does not retry inbox webhooks, so lost events still heal via reconcile-on-open (state + outgoing messages, REQ-045) and the bot `pendingSince` sweep. Test: `webhook.test.js` "F4: handler failure frees the delivery id…". |
| F5 | 🟡 P2 | api/src/tickets/service.js:225-235 (`findTicket` fallback) | The fallback binds any conversation that carries `custom_attributes.ticket_number` to an unsynced ticket. API-channel inboxes expose Chatwoot's public client API (by `inbox_identifier`), where a contact can create conversations with custom attributes. Someone with the identifier could hijack a queued ticket's thread, and the victim's messages would then go to the attacker's conversation. The window is small (only unsynced tickets). Suggest also checking `conv.meta.sender.identifier === String(ticket.customerId)`. | Open |
| F6 | 🟡 P2 | docker-compose.yml:24 + api/src/app.js:23 | The API is published on `0.0.0.0:4000` with `trust proxy 1`. A direct caller can set `X-Forwarded-For` and rotate `req.ip`, which bypasses the per-IP register/login limits (REQ-002). Bind to `127.0.0.1:4000:4000`, or stop publishing it, since web proxies to `api:4000`. | Open |
| F7 | 🟡 P2 | api/src/tickets/service.js:73 | `create()` awaits the inline Chatwoot sync, which can be createContact plus createConversation at 10 s each. If Chatwoot hangs, ticket creation takes up to about 20 s, against REQ-004's 2 s. Could the inline sync be fire-and-forget, since the ticket is already persisted and the worker retries? | **Fixed.** Inline Chatwoot attempts in `create()`/`addCustomerMessage()` are capped at `CHATWOOT_INLINE_MS` (1.5 s); a slower attempt finishes or reschedules in the background, `afterInline` (F1) still keeps the worker off. Retries dedupe: `syncTicket` looks up the contact's conversation by `ticket_number` when `attempts > 0`; `syncMessage` sends `source_id: smartcc-<msgId>` and on retry reuses a matching Chatwoot message. Tests: `tickets.test.js` three "F7:" cases. |
| F8 | 🟢 P3 | api/src/auth/routes.js:24 | The login limiter counts every attempt, including successful ones. REQ-002 says "10 failed attempts". This is stricter than specified, so it is harmless for the demo. | **Fixed.** `limit({ failuresOnly })` un-counts responses < 400; login uses it. Test: `auth.test.js` "F8: successful logins do not count…". |
| F9 | 🟢 P3 | api/src/tickets/routes.js:52 | `await svc.maybeReconcile(t)` runs after `res.json`. If it throws, the error middleware tries to write to a response that was already sent. Could it be wrapped in `.catch(log)`? | **Fixed.** `maybeReconcile(t).catch(log.warn)` after `res.json`. Test: `tickets.test.js` "F9: …". |
| F10 | 🟢 P3 | api/src/tickets/service.js:36-42 | The list cursor is `updatedAt` alone, so tickets with identical `updatedAt` at a page boundary can be skipped. Use an `(updatedAt, _id)` cursor if it matters. | **Fixed.** Cursor is `<updatedAt ISO>_<id>`, sort `(updatedAt, _id) desc`, bare ISO still accepted, malformed → 400. lld-backend E7 updated. Test: `tickets.test.js` "F10: tickets sharing updatedAt…". |
| F11 | 🟢 P3 | api/src/lib/log.js:4 | The redaction regex does not cover `token` or `secret` keys. Nothing logs them today, so this is hardening only. | **Fixed.** Redaction regex adds `token|secret`. Test: `infra.test.js` "logger redacts token/secret keys (F11)". |
| F12 | 🟢 P3 | chatwoot/.../PortalTicketPanel.vue:17 | A malformed `sla_due_at` (an agent can edit custom attributes) makes `date-fns format` throw a RangeError and breaks the sidebar panel. Guard with `isValid(date)`. | **Fixed.** `isValid(date)` guard → `—`. Test: `PortalTicketPanel.spec.js` "shows — for a malformed sla_due_at…". |
| F13 | 🟢 P3 | api/src/tickets/service.js:287 | Attachment-only Chatwoot messages are upserted with `body: ''`, because validators do not run on `findOneAndUpdate`. The empty bubble shows in the portal. | **Fixed.** Blank Chatwoot content is stored as `(Attachment — not shown in the portal)`. Test: `webhook.test.js` "F13: …". |
| F14 | 🟢 P3 | web/test/pages.test.tsx | The test mocks return `undefined` for `['me']`, which logs "Query data cannot be undefined" to stderr. Return `null` instead. | **Fixed.** Mock queues now answer the `['me']` refetch with 401 (KB test order fixed), so no undefined query data; stderr clean. |

## 4. Tests
- `cd api && npx vitest run` → **19 files, 118 tests passed**. That is 116 before the fixes plus 2 new regression tests.
- `cd web && npx vitest run` → **5 files, 40 tests passed**.
- `cd web && npx tsc --noEmit` → **clean**.
- Both new tests were confirmed to fail with the fixes reverted.

## 5. Verdict
**APPROVE WITH FOLLOW-UPS.**
- The three blocking issues are fixed and covered by tests: duplicate Chatwoot sends, the reopen-stuck race, and the exposed trust-auth Postgres.
- F4–F7 (🟡) are real but not blocking for a single-host demo. Schedule them before any shared or LAN deployment; F5 and F6 first.
- Run `docker compose config` once the concurrent build finishes, to confirm the `!reset` overlay.

## Post-review fixes (orchestrator)
- F5 fixed: `findTicket` fallback now requires `conv.meta.sender.identifier` to equal the ticket's `customerId` (`api/src/tickets/service.js`); forged-owner case added to `test/int/webhook.test.js`. API suite 118/118.
- F6 fixed: api port published on `127.0.0.1:4000` only (`docker-compose.yml`); Chatwoot reaches it over the compose network.
- F4, F7–F14 fixed (see table). API 19 files / 127 tests, web 5 files / 40 tests, `tsc` clean, PortalTicketPanel spec 3/3. Each new API test confirmed failing with its fix reverted.
