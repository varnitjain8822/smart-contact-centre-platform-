# Smart Contact Center v3 — Plan

## 1. Goal

A customer-facing support portal (new UI). Tickets raised there are worked by agents and admins inside Chatwoot, with an AI bot answering first and handing off to humans. Replies and status flow back to the customer portal in real time.

Reference only: `smart-contact-center-updated-shareable (1).zip` (ideas, data model, seed content). Its agent/admin screens are replaced by Chatwoot; its keyword "AI" is replaced by a real LLM.

## 2. What we keep / drop from the zip

| Zip feature | v3 |
|---|---|
| Customer login/register (JWT, bcrypt) | Keep |
| Create ticket, list, detail, chat thread | Keep, new UI, thread synced with Chatwoot |
| Reopen / close / CSAT 1–5 | Keep in portal, mirrored to Chatwoot |
| Knowledge base (customer reading) | Keep; also the RAG source for the bot |
| SLA timers (Critical 15m … Low 24h) | Keep in portal (Chatwoot SLA is enterprise-only) |
| 3-tier handoff (>85 auto, 60–85 draft, <60 human) + escalation triggers (fraud, legal, angry…) | Keep the rules, now driven by LLM output |
| Agent dashboard, claim/transfer, agent routing, customers 360, analytics, KB editing | Drop — Chatwoot does these |
| Keyword NLU, fake 64-dim embeddings | Drop — LLM + real retrieval |
| Single 4700-line `main.jsx` | Drop — split into pages |
| mongodb-memory-server fallback | Keep for dev only |

## 3. Architecture

```
 Customer browser
      │  HTTPS (JWT)
      ▼
 ┌──────────────────────────┐        Application API (api_access_token)
 │ portal-api (Express)     │ ─────────────────────────────────────────┐
 │  /api/auth /api/tickets  │                                          ▼
 │  /api/kb  /api/stream    │                               ┌────────────────────┐
 │  /webhooks/chatwoot  ◄───┼──── inbox webhook (signed) ───│ Chatwoot (docker)  │
 │  /bot/chatwoot       ◄───┼──── agent-bot webhook ────────│ rails+sidekiq      │
 │  ai/ (LLM + RAG)         │ ──── bot replies / handoff ──►│ postgres+redis     │
 └──────────┬───────────────┘                               └────────────────────┘
            │                                                     ▲
         MongoDB                                         Agents / admins (Chatwoot UI)
```

One Node service holds the portal API, webhook receiver and AI bot. A separate bot service waits until load needs it.

Chatwoot is forked into `smartcc/chatwoot/`, keeping an `upstream` remote so new Chatwoot releases can be merged in. The integration itself still goes only through Chatwoot's API, webhooks and Agent Bot, which keeps upstream merges clean. Code changes in the fork are limited to:
- branding (name, logo, colours);
- a "Portal ticket" panel in the conversation sidebar showing the ticket number, SLA due time, AI tier and CSAT, read from custom attributes;
- Captain Tasks pointed at Groq.

## 4. Data flow

1. **Setup (script, once):** create an API-channel inbox (`webhook_url = portal/webhooks/chatwoot`), an Agent Bot (`outgoing_url = portal/bot/chatwoot`), attach it to the inbox, and create custom attributes `ticket_number` and `sla_due_at` plus labels per category. Keep the inbox secret and the admin and bot tokens in `.env`.
2. **Customer creates a ticket:**
   - The portal saves the ticket in Mongo.
   - It upserts the Chatwoot contact (`identifier = userId`).
   - It calls `POST conversations` with `{source_id, inbox_id, custom_attributes:{ticket_number}, message}`.
   - It stores `conversationId` on the ticket.
3. **Bot:** the conversation starts as `pending`. The bot receives `message_created` (incoming) and:
   - retrieves the top KB articles;
   - calls the LLM with structured JSON output `{intent, category, priority, confidence, triggers[], answer, sources[]}`;
   - applies the tier rule:
     - **auto:** posts a public reply and leaves the conversation pending. The customer can accept (resolve) or ask for a human.
     - **draft:** posts the answer as a private note "AI draft", sets labels and priority, then `toggle_status open`. A human reviews it.
     - **human:** posts a private note with the summary and triggers, sets priority, then `toggle_status open`.
4. **Agent replies in Chatwoot:** the `message_created` webhook (outgoing, not private) is appended to the ticket thread and pushed to the customer over SSE.
5. **Status / priority / label changes:** `conversation_status_changed` and `conversation_updated` are mapped onto the ticket.
6. **Customer follow-up:** sent as `POST messages` (incoming). It reopens the conversation if it was resolved. The bot sees it again only while the conversation is `pending`.
7. **CSAT:** stored in the portal and sent to Chatwoot as a private note plus the custom attribute `csat`.

Webhook safety:
- Verify `X-Chatwoot-Signature` (HMAC-SHA256 of `timestamp.body`).
- Dedupe on `X-Chatwoot-Delivery`.
- Ignore echoes of our own incoming messages.

Status map:

| Portal | Chatwoot |
|---|---|
| AI Handling | `pending` (bot owns it) |
| In Progress | `open` |
| Waiting on you | `snoozed` |
| Resolved | `resolved` |

Priority map: Low/Medium/High/Critical ↔ `low`/`medium`/`high`/`urgent`.

## 5. Tech stack

| Part | Choice |
|---|---|
| portal-web | React + Vite + TypeScript, Tailwind, TanStack Query, React Router |
| portal-api | Node 22, Express, Mongoose, zod validation, SSE for live updates |
| AI | Groq (OpenAI-compatible `https://api.groq.com/openai/v1/chat/completions`, plain `fetch`, model from `GROQ_MODEL`, default `openai/gpt-oss-120b`, `response_format: json_object`). Retrieval: Mongo text index over the KB first; add embeddings only if recall is poor. The same Groq key also powers Chatwoot's MIT Captain Tasks (summarize, reply suggestion) via `CAPTAIN_OPEN_AI_ENDPOINT=https://api.groq.com/openai`. |
| Chatwoot | Forked into `smartcc/chatwoot/` (upstream remote kept for merges), built from source with its dev `docker-compose.yaml`: Postgres (pgvector), Redis, Sidekiq |
| Tests | Vitest (API + AI tier logic with mocked LLM), Playwright e2e for the customer flow |

## 6. Repo layout

```
smartcc/
  docker-compose.yml        # mongo + chatwoot stack + portal
  .env.example
  scripts/chatwoot-setup.mjs
  api/   src/{routes,models,chatwoot,ai,sla}  test/
  web/   src/{pages,components,lib}
  e2e/
  .ai/artifacts/            # prd-to-prod stage outputs
```

## 7. Customer UI (new)

Pages:
- Sign in / register.
- Home: open tickets, SLA countdowns, search the KB.
- New ticket: as the customer types, the AI shows a live "possible answer" with KB sources (deflection before submit).
- Ticket thread:
  - chat-style, live;
  - AI messages badged with their sources;
  - "This solved it" / "Talk to a human" buttons;
  - status timeline and SLA chip.
- Help Center (KB).
- Profile.

Design:
- light and dark themes;
- mobile-first;
- WCAG AA.

The design direction is set at the frontend HLD stage.

## 8. Delivery via prd-to-prod

Mode chosen: **docs once, then build**. Stages 1–7 are produced together and approved in a single gate. Stages 8–10 then run without further gates.

The repo is an Antigravity pack, so it is run manually in Claude Code:
- the same stages and the same `.ai/artifacts/` outputs;
- an APPROVE / REJECT / ITERATE gate after each stage;
- each stage's `SKILL.md` is followed;
- the Antigravity hooks are not used (they do not fire under Claude Code);
- in Stage 8, the trading-specific coding rules are replaced by Node/React norms.

| # | Stage | Output |
|---|---|---|
| 1 | PRD (interview, scope = fullstack) | requirements.md, traceability.md |
| 2 | PRD review | prd-review.md |
| 3 | HLD backend + frontend | hld-backend.md, hld-frontend.md, tech-stack.md |
| 4 | HLD review | hld-review.md |
| 5 | LLD backend + frontend + API contract check | lld-*.md, lld.md |
| 6 | LLD review | lld-review.md |
| 7 | Planning | planning.md, tasks.json |
| 8 | Implementation, in this order:<br>a) compose + Chatwoot up + setup script<br>b) API: auth, tickets, Chatwoot sync, webhooks, SSE<br>c) AI bot + tier logic<br>d) web UI<br>e) seed KB | code |
| 9 | Code review | review.md |
| 10 | QA: unit + Playwright e2e covering create ticket → bot → agent reply → customer sees it | test-report.md |

## 9. Milestone demo (definition of done)

`docker compose up` brings everything up. A customer raises "payment deducted but plan inactive". The bot answers from the KB, or drafts and hands off. An agent replies in Chatwoot at `:3000`. The customer sees the reply live at `:5173`. The agent resolves the conversation, the portal shows Resolved, and the customer leaves a CSAT rating.

## 10. Risks

- **Chatwoot memory:** it needs about 4 GB RAM in Docker.
- **Enterprise features:** Captain Assistant (autonomous agent) and SLA are enterprise-licensed. We use our own bot plus the MIT Captain Tasks (summarize, reply suggestion), so no licence is needed.
- **Webhook URL:** Chatwoot in Docker must reach the portal through `host.docker.internal` in dev.
- **LLM key:** `GROQ_API_KEY` is required. Without it, the bot falls back to "human handoff" for everything.
- **Groq limits:** Groq has rate limits. On a 429 response the bot retries once, then falls back to handoff.
- **Fork build:** building Chatwoot from source makes the first build slow (about 10–15 minutes).
