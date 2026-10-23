# Tech Stack — Smart Contact Center v3

Pinned majors; exact versions locked by `package-lock.json` at Stage 8. Every dependency is listed with the reason it
exists; nothing else may be added without updating this file.

## Runtime / infra

| Component | Choice | Version | Reason |
|---|---|---|---|
| Container orchestration | Docker Compose | ≥ 2.20 (needs `include:`) | REQ-048 one command |
| Customer DB | MongoDB | 7.x image `mongo:7` | PLAN |
| Agent workspace | Chatwoot fork (`smartcc/chatwoot`, branch `smartcc` from tag `v4.18.0`) | 4.18.x | PLAN; its own Postgres (pgvector pg16), Redis, Sidekiq, Vite, Mailhog |
| LLM | Groq OpenAI-compatible `POST https://api.groq.com/openai/v1/chat/completions` | model `openai/gpt-oss-120b` (env) | PLAN |
| Node | Node.js | 22 LTS (`node:22-alpine`) | PLAN; global `fetch`, `AbortSignal.timeout`, `crypto.timingSafeEqual` |

## portal-api (`api/`) — ESM JavaScript

| Package | Version | Why |
|---|---|---|
| express | ^5.1 | HTTP; v5 forwards async errors to error middleware (no wrapper) |
| mongoose | ^8.8 | ODM, schemas, indexes |
| zod | ^3.24 | request + LLM output validation |
| jsonwebtoken | ^9.0 | session JWT |
| bcryptjs | ^2.4 | password hash (pure JS: no native build in alpine) |
| cookie-parser | ^1.4 | read session cookie |
| **dev** vitest | ^3.0 | unit/integration tests |
| **dev** supertest | ^7.0 | HTTP integration tests |
| **dev** mongodb-memory-server | ^10.1 | in-memory Mongo for tests and `MONGO_MEMORY=1` dev |

Not used (deliberately): axios (fetch), express-rate-limit (15-line limiter), winston/pino (JSON `console.log`), BullMQ/Redis (in-process queue at pilot scale), OpenAI SDK (plain fetch per PLAN), helmet (3 headers set manually: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`).

## portal-web (`web/`) — TypeScript

| Package | Version | Why |
|---|---|---|
| react, react-dom | ^18.3 | UI |
| react-router-dom | ^6.28 | routing, `lazy` |
| @tanstack/react-query | ^5.62 | server state |
| tailwindcss, postcss, autoprefixer | ^3.4 / ^8 / ^10 | styling with CSS-variable tokens |
| lucide-react | ^0.460 | icons |
| @fontsource-variable/bricolage-grotesque, @fontsource-variable/figtree | ^5 | self-hosted fonts |
| vite, @vitejs/plugin-react | ^6 / ^4 | build/dev/preview + proxy |
| typescript | ^5.6 | strict mode |
| **dev** vitest, @testing-library/react, @testing-library/user-event, jsdom | ^3 / ^16 / ^14 / ^25 | component + hook tests |

## e2e (`e2e/`)

| Package | Version | Why |
|---|---|---|
| @playwright/test | ^1.49 | customer-flow e2e + axe scan |
| @axe-core/playwright | ^4.10 | WCAG AA automated checks |

A Groq stub (`e2e/groq-stub.mjs`, Node `http`, no deps) serves deterministic LLM output via `GROQ_URL`.

## Chatwoot fork additions
No new dependencies. Vue 3 SFC using existing components (`AccordionItem`), existing i18n.
