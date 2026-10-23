# SmartCC v2: Customer UI, Dashboard and Production Readiness

Status on 2026-10-23: v1 is done, all tests pass, and the stack runs locally.

This plan covers three things:
1. a richer customer dashboard;
2. a UI upgrade on every page;
3. making the local stack production-grade.

Deployment stays out of scope: everything runs locally.

## 0. Where we are (gap analysis)

The current portal has 6 pages: Home, New ticket, Ticket thread, Help, Article and Profile.

**Gaps on the customer side:**
- **Home** is just a list of tickets with an Open/Resolved/All filter and an empty state. There are no stats, no activity feed and no recommendations.
- **Tickets:** there is no search, no category/priority/date filters and no sort.
- **Attachments:** customers cannot upload screenshots or invoices, and agent attachments show as a placeholder.
- **Notifications:** none exist, neither in-app nor email.
- **AI:** there is no way to chat with the AI before raising a ticket. The only help is the suggestion panel on New ticket.
- **Language:** English only.

**Gaps on the production side:**
- Chatwoot runs in **development** mode (rails dev, plus a vite dev server that has already crashed once).
- There are no security headers or compression, and no single origin or HTTPS.
- There are no backups, and Mongo has no auth.
- The Groq stub is still wired into the running api.
- Nothing is committed.

The API today has auth (register, login, me, password), tickets (list, get, create, messages, accept, handoff, resolve, csat), KB (articles, search), `/suggest`, `/healthz` and the two Chatwoot webhooks.

## 1. Feature scope (all selected)

| # | Feature | Customer value |
|---|---|---|
| F1 | Dashboard overview: stats, SLA watch, activity timeline, popular articles, quick actions | See everything at a glance |
| F2 | Ticket search, filters and sort, plus a table view on desktop | Find old tickets fast |
| F3 | Attachments (upload and download) and transcript download | Share proof, keep records |
| F4 | Notifications: in-app bell and email, with per-user preferences | Know when the agent replies without checking |
| F5 | Live AI assistant chat with "Convert to ticket" | Get an instant answer and skip waiting |
| F6 | Hindi and English, covering UI, AI replies, emails and KB | Wider reach |
| F7 | UI polish on all existing pages | Feels premium and trustworthy |
| F8 | Production readiness, run locally | Safe, stable, recoverable |

## 2. Phases

### Phase 1: UI foundation
This phase unblocks everything else.

**New UI primitives** in `web/src/ui/`:
- Card, StatCard, Badge, Tabs, Skeleton, Avatar, DataTable (sortable, responsive into cards on mobile), DropdownMenu, Tooltip, Popover, FileDrop, EmptyState v2.
- Every primitive keeps WCAG AA, works with the keyboard, and supports light and dark themes.

**Other changes:**
- **App shell v2:** top bar with global search (⌘K), notification bell, language switch and user menu. The sidebar gets an "Assistant" entry. Mobile keeps its bottom tabs, adding Assistant.
- **Errors and loading:** an `ErrorBoundary` on every route, a real 404 page, an offline banner, and skeleton loaders instead of spinners.
- **i18n:** `i18next` and `react-i18next`, with `web/src/locales/{en,hi}.json`. Every existing string moves into them. A Devanagari font subset is added. The language preference is saved on the user.

Acceptance:
- all existing tests are green;
- no hard-coded user-facing strings remain (a lint script checks this);
- axe reports 0 serious or critical issues.

### Phase 2: F1 dashboard overview

**API:** `GET /api/me/overview` returns:
```json
{ "counts": {"open":2,"aiHandling":1,"waitingOnYou":0,"resolved30d":7},
  "avgFirstResponseMin": 12, "avgResolutionHrs": 5.4, "csatAvg": 4.6,
  "slaWatch": [{"number":"SC-1012","dueAt":"…","state":"at_risk"}],
  "activity": [{"type":"agent_reply|status|ai_answer|csat","ticket":"SC-1012","at":"…","text":"…"}],
  "popularArticles": [{"slug":"…","title":"…","views":120}] }
```
- It is computed with Mongo aggregation and a 30 s per-user in-memory cache.
- The `activity` list is taken from the most recent messages and status changes.

**UI on Home:**
- greeting;
- 4 stat cards: Open, AI handling, Waiting on you, Resolved in the last 30 days;
- an "Needs your attention" strip: tickets waiting on the customer, plus SLA at risk;
- an activity timeline with the 10 most recent items;
- recent tickets, with a link to all;
- popular help articles;
- quick actions: New ticket, Ask AI, Help Center;
- a friendly first-run empty state for new users.

**KB:** add a `views` counter on the article model, incremented on the article GET.

### Phase 3: F2 search, filters and sort

**API:** extend `GET /api/tickets` with:
- `q`, using a text index on subject, description and number;
- `status[]`, `category[]` and `priority[]`;
- `from` and `to`;
- `sort`, one of `updated|created|priority|sla`.

The existing cursor paging is kept.

**UI:**
- a `/tickets` page with a filter bar (chips plus a "More filters" popover) and URL-synced filters, so they can be shared and survive a refresh;
- DataTable on desktop with these columns: number, subject, status, priority, SLA, last update;
- cards on mobile.

### Phase 4: F3 attachments and transcript

**Upload:** `POST /api/tickets/:number/attachments`
- `multer` with a 10 MB limit;
- allowed types are png, jpg, webp, pdf and txt, checked by magic bytes;
- files are stored in the volume `/data/uploads/<ticketId>/<uuid>`;
- the file is linked to the message.

**Other API changes:**
- Ticket creation and messages accept `attachmentIds[]`.
- Uploads are synced to Chatwoot as a multipart `POST messages` with `attachments[]`.
- Agent attachments arrive by webhook. The api downloads them through the existing `SAFE_FETCH` network and serves them back only to the ticket owner, with an auth check, at `GET /api/attachments/:id`.
- **Transcript:** `GET /api/tickets/:number/transcript?format=txt`. There is also a print stylesheet so "Save as PDF" works from the browser. No PDF library is used.

**UI:**
- a FileDrop on New ticket and in the Composer, with drag and drop, paste-a-screenshot, previews and a progress bar;
- an image lightbox in the thread;
- a "Download transcript" item in the ticket menu.

### Phase 5: F4 notifications

**Model:** `Notification {userId, type, ticketNumber, title, body, readAt, createdAt}` with a TTL of 90 days.

**What creates a notification:**
- an agent's public reply;
- a status change, to waiting on you or resolved;
- an SLA breach;
- an AI answer that is waiting for the customer's acceptance.

**API:**
- `GET /api/notifications` (paged, plus the unread count);
- `POST /api/notifications/read` (ids or all);
- an SSE event `notification.created`.

**Email:**
- sent with `nodemailer` over SMTP; locally this is **mailhog**, which is already in the stack, at http://localhost:8025;
- templates for both locales;
- per-user prefs in `User.notify = {email:{reply,status,sla}, inApp:true}`;
- throttled so a ticket gets at most 1 email per 5 minutes;
- an unsubscribe link backed by a signed token.

**UI:**
- a bell with an unread badge and a popover list, where clicking an item marks it read and opens the ticket;
- `/notifications` for the full list;
- a Notification preferences section in Profile;
- browser tab title shows `(2) SmartCC`.

### Phase 6: F5 live AI assistant

**API:** `POST /api/assistant/chat`
- Takes `{messages[], locale}`. The history is sent by the client and capped at the last 10 turns and 4k characters.
- It retrieves the top KB articles and calls Groq with `stream: true`. The response is relayed to the browser as SSE token chunks.
- The output carries sources (only articles that were in the prompt) and a `suggestTicket` flag, which is raised on low confidence or when a trigger matches.
- It is rate limited to 20 messages per 10 minutes per user.
- Without a Groq key it says "AI unavailable", and the UI offers to raise a ticket instead.

**UI:**
- an `/assistant` page plus a floating launcher on every page (except the thread page on mobile);
- streaming bubbles, source chips and a "Was this helpful?" control;
- a **Convert to ticket** button that pre-fills the subject from the first question and the description from the chat transcript;
- chats are not stored server-side in v2, only in `sessionStorage`.

### Phase 7: F6 Hindi

- **UI:** every string is in `hi.json`, reviewed for natural Hindi rather than literal translation. Dates and numbers use `Intl` with `hi-IN`.
- **AI:** the bot prompt gets a "Reply in {locale}" line, using the customer's locale stored on the ticket. The Assistant follows the current UI locale.
- **KB:** a `locale` field on the article, plus Hindi translations of the 11 seed articles. Retrieval prefers the customer's locale and falls back to English.
- **Email:** templates exist in both locales.

### Phase 8: F7 UI polish on existing pages

| Page | Upgrades |
|---|---|
| Login and Register | Split layout with a brand panel and a short value list; show/hide password; a password strength meter; "Remember me" |
| New ticket | Topic as icon cards instead of a select; an expected-response-time hint per priority; AI suggestion as a sticky side panel on desktop; attachments; draft autosave |
| Ticket thread | Agent name and avatar; Chatwoot typing indicator (`conversation_typing_on/off` relayed by SSE); day separators; a status timeline drawer; jump to latest; attachment previews; transcript |
| Help Center | Search with highlighted matches; category landing pages; "Was this helpful? 👍/👎" (stored); related articles; reading time |
| Profile | Avatar initials and colour; phone and organisation; language; notification prefs; theme; active-session sign-out |
| Global | ⌘K command palette for tickets, articles and actions; consistent page headers and breadcrumbs; motion limited to 150–200 ms and honouring `prefers-reduced-motion` |

Visual direction: keep the existing "Paper & Signal" tokens and refine density, hierarchy and data visualisation. The `frontend-design` skill is used before building.

### Phase 9: F8 production readiness (local)

> **Update 2026-10-23:** the user does not want deployment for now. The prod profile (Chatwoot production image, Caddy HTTPS) is written but **parked and unverified**, because its image build filled the Docker disk. What stays active in dev: Mongo auth, healthchecks, log rotation, backup/restore (drill passed) and api hardening.

**Chatwoot in production mode:**
- A compose profile `prod` runs `RAILS_ENV=production`, with assets precompiled into the image (a fork Dockerfile stage).
- There is no vite dev server and no mailhog in prod. SMTP can be configured.
- Dev mode remains available through the `dev` profile.

**Single origin with HTTPS:** a Caddy reverse proxy in front.
- `https://smartcc.localhost` serves the portal (static web build plus `/api`).
- `https://agent.smartcc.localhost` serves Chatwoot.
- Caddy's internal CA provides local HTTPS.
- No other ports are published, except optionally the api on localhost for debugging.

**api hardening:**
- `helmet` with a strict CSP, and `compression`;
- request id in every log line;
- body size limits;
- graceful shutdown that drains SSE connections;
- Mongo with auth (an app user with least privilege);
- startup index sync;
- the Groq stub only under `docker-compose.e2e.yml`, never by default.

**web:** a static build served by Caddy, with immutable cache headers on hashed assets and a 150 KB gzip entry budget enforced in CI.

**Secrets:** `init-env.mjs` generates everything, and there are no default passwords anywhere. `.env` is never copied or committed.

**Backups:**
- `scripts/backup.sh` runs mongodump, pg_dump and a tar of uploads into `backups/<date>/`;
- `scripts/restore.sh` restores them;
- a restore drill is run as an e2e step.

**Operations:**
- docker healthchecks on every service and `restart: unless-stopped`;
- log rotation (json-file `max-size`);
- `/healthz` reports per-dependency status;
- `make up`, `make prod` and `make backup` helpers.

**Quality gates:**
- **Lighthouse:** ≥ 90 for performance, a11y and best practices on Home, New ticket and Thread.
- **k6 load test:** 200 virtual users browsing and creating tickets, with p95 API time ≤ 500 ms (excluding AI).
- **Housekeeping:** delete `chatwoot/core` (3.7 GB dump); commit the root repo and the fork's `smartcc` branch; tag `v2.0.0`.

### Phase 10: QA

- **Unit tests:** every new API route, including the notification triggers, upload validation, the assistant rate limit and the overview aggregation.
- **Web tests:** stat cards, filters synced to the URL, FileDrop, the bell, the assistant streaming render, and the language switch.
- **E2E (Playwright)** against the prod profile:
  - dashboard numbers match the data;
  - search and filter;
  - attach a screenshot, which the agent sees in Chatwoot, and an agent attachment, which the customer can download;
  - an agent reply produces both a bell notification and an email in mailhog;
  - assistant chat followed by convert to ticket;
  - a full Hindi flow;
  - a11y on all pages in both themes;
  - mobile at 360 px.
- A real Groq run, once the key has been added: AI first-response p95 ≤ 15 s.

## 3. Order and dependencies

```
P1 Foundation ──┬─► P2 Dashboard ─┐
                ├─► P3 Search ────┤
                ├─► P4 Attachments┼─► P8 Polish ─► P9 Prod readiness ─► P10 QA ─► commit + tag
                ├─► P5 Notifications
                ├─► P6 Assistant ─┤
                └─► P7 Hindi ─────┘   (P7 strings are final only after P2–P6 UI lands)
```

Phases 2 to 6 can run in parallel: the backend and web parts of each feature go to one agent per feature. Phase 9 can start its infrastructure work (Caddy, Chatwoot prod image, backups) in parallel with phases 2 to 8.

## 4. New dependencies (only these)

| Package | Where | Why |
|---|---|---|
| i18next, react-i18next | web | i18n (standard choice, small) |
| multer, file-type | api | uploads plus magic-byte check |
| nodemailer | api | email over SMTP |
| helmet, compression | api | security headers, gzip |
| Caddy (image) | infra | HTTPS plus reverse proxy, auto local CA |
| k6 (image) | test | load test |

Not added:
- a UI kit, because our own primitives are enough;
- a PDF library, because the print stylesheet covers it;
- Redis on the portal side, because an in-memory cache is enough for a single api instance.

## 5. Needed from the user

1. A **GROQ_API_KEY** in `.env`, required for phase 6 and the real-AI QA.
2. A Hindi review of `hi.json` by a native speaker. Optional, but recommended.
3. An OK to delete `chatwoot/core` and to make the git commits.

## 6. Definition of done

- `make prod` brings up everything at `https://smartcc.localhost` and `https://agent.smartcc.localhost`.
- A new customer, in either Hindi or English, can:
  - see a meaningful dashboard;
  - chat with the AI and convert the chat to a ticket with a screenshot attached;
  - get a bell notification and an email when the agent replies;
  - search their tickets, download the transcript and rate the service.
- All test suites are green, Lighthouse is ≥ 90, the k6 p95 is ≤ 500 ms, and the backup/restore drill passes.
- Everything is committed and tagged as `v2.0.0`.
