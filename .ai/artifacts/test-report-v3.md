# Test Report — PLAN-v3 (dev profile)

Sections are appended per feature.

## Features 3 + 4: Agent AI copilot and SmartCC Analytics (2026-10-23)

Stack: dev profile. Chatwoot is at http://localhost:3310 (rails dev, vite HMR) and the api at 127.0.0.1:4000 (image rebuilt). Groq is real: `openai/gpt-oss-120b` with one key.

### Copilot (Chatwoot Captain Tasks → Groq)
Config: `scripts/chatwoot-bootstrap.rb` was re-run with `rails runner`. It set:
- `CAPTAIN_OPEN_AI_ENDPOINT=https://api.groq.com/openai` (Captain appends `/v1`);
- `CAPTAIN_OPEN_AI_MODEL=openai/gpt-oss-120b`;
- `CAPTAIN_OPEN_AI_API_KEY` = the first key of `GROQ_API_KEY` (56 chars, no comma);
- the `captain_tasks` feature flag on account SmartCC.

Two fork fixes were needed (Groq names are not in `config/llm.yml`):
- `lib/llm/feature_router.rb`: when the endpoint is not OpenAI, `CAPTAIN_OPEN_AI_MODEL` is used for every feature. Before, it applied only to `conversation_completion` on paid installs, so tasks asked Groq for `gpt-4.1-mini`.
- `lib/captain/base_task_service.rb`: a model outside llm.yml is called with `provider: :openai, assume_model_exists: true`. Otherwise RubyLLM's registry maps `openai/gpt-oss-120b` to OpenRouter.

| Check | Result |
|---|---|
| Application API as Demo Agent (/auth/sign_in token), conv #175: reply_suggestion · summarize · rewrite(friendly) · label_suggestion | ✓ 200 in 0.6–1.7 s with real Groq text, e.g. label_suggestion → `billing, account` |
| UI (Playwright, agent): ✦ menu → Summarize (conv #175), Suggest a reply and Change tone → Friendly (conv #18) | ✓ `/private/tmp/claude-501/-Users-varnitjain4245/bda131ad-2b23-4a92-95f5-77d9ee1bf5f4/scratchpad/v3/copilot-1b-summarize.png`, `copilot-2b-suggest.png`, `copilot-3b-friendly.png` |
| Priority suggestion | n/a: Chatwoot has no Captain priority-suggestion task. Priority is set by the portal bot (togglePriority) |
| Portal ticket panel "AI summary": new portal ticket SC-1143 → bot wrote `ai_summary` on conv #176 → panel shows it | ✓ `/private/tmp/claude-501/-Users-varnitjain4245/bda131ad-2b23-4a92-95f5-77d9ee1bf5f4/scratchpad/v3/portal-panel-ai-summary.png` |
| rspec spec/lib/captain + spec/lib/llm (in the rails container, RAILS_ENV=test) | ✓ 102/102 |

### Analytics
| Check | Result |
|---|---|
| api `test/int/adminAnalytics.test.js` (mongodb-memory-server, fake Chatwoot /profile through a fetch spy): auth 401/403/cache, CORS, every metric, defaults/empty/400, 502 | ✓ 5/5 |
| Live: preflight from :3310 → 204 + ACAO; Demo Agent → 403; admin → 200 + ACAO | ✓ |
| Live page `/app/accounts/3/reports/smartcc` (admin, Last 7 days) compared with the api response the page received (`?from=2026-10-17&to=2026-10-23`): tickets 126 = 126, deflection 6.3 % = 6.3, breaches 4 = 4, CSAT 5 = 5, KB gaps 16 = 16 | ✓ `/private/tmp/claude-501/-Users-varnitjain4245/bda131ad-2b23-4a92-95f5-77d9ee1bf5f4/scratchpad/v3/analytics-light.png`, `/private/tmp/claude-501/-Users-varnitjain4245/bda131ad-2b23-4a92-95f5-77d9ee1bf5f4/scratchpad/v3/analytics-dark.png` |
| Chatwoot vitest (TZ=UTC): SmartccAnalytics.spec (3), PortalTicketPanel.spec (3), ReportContainer.spec (6, regression) | ✓ 12/12 |
| eslint on changed fork files | 0 errors. 6 warnings: 5 intlify dynamic-key, 1 pre-existing no-root-v-if |
| api full suite | ✓ 34 files / 206 tests |

## Features 1, 2, 5: WhatsApp channel, sign-in codes (OTP), vector search (2026-10-23)

Stack: dev profile, with the api image rebuilt on `node:22-slim`. `make e2e` used the Groq stub, which also serves the WhatsApp Graph API mock for sidekiq. Afterwards api and sidekiq were recreated without the overlay and the stub was removed. `healthz` → `groq: configured`, `GROQ_URL=https://api.groq.com/openai/v1`, and sidekiq has no `WHATSAPP_CLOUD_BASE_URL`.

### Suites
| Suite | Result |
|---|---|
| `cd api && npx vitest run` | ✓ 34 files, 206 tests. New: `int/otp.test.js` (7), `unit/sms.test.js` (4, fetch mocks for msg91/twilio), `int/whatsapp.test.js` (4), `int/vectors.test.js` (4, fake embedder). Updated: DTO key sets now include `channel` |
| `cd api && npm run eval` (real model) | ✓ 44 questions (22 en + 22 hi): **top-3 recall text-only 0.955 → hybrid 1.000**; top-1 0.864 → 0.955 |
| `cd web && npx vitest run` | ✓ 9 files, 77 tests (new `test/v3.test.tsx`: OTP form flow, unknown email → create, register validation, WhatsApp badge) |
| `npx tsc --noEmit`, `npm run lint:strings` (467 keys), `npm run build` | ✓ |
| `make e2e` | ✓ 16/16 in 2.6 min, including the new `v3.spec.ts` (31 s, most of it the 30 s resend cooldown) |

### What `v3.spec.ts` proves (one flow)
1. Register → "Sign up with an email code instead". The code is read from the mailhog API (`/api/v2/search`, subject `NNNNNN is your SmartCC sign-in code`). The field has `autocomplete=one-time-code`. Create account → signed in.
2. A phone number is set on the account (PATCH /api/me).
3. A WhatsApp Cloud inbox with fake credentials is created by `rails runner` in sidekiq, so the credential check goes to the mock. The SmartCC AI bot and the agents are attached.
4. Meta's exact inbound payload is posted to Chatwoot `/webhooks/whatsapp/+15550001234` → 200. Sidekiq creates the conversation, the bot webhook creates portal ticket `channel: whatsapp` for the linked user, and the stub AI answers in the auto tier.
5. The mock received `POST /v13.0/1555000111/messages` with Bearer auth to the customer's wa_id. The body is plain text (no `**` or `](`), ≤ 4096 chars, and holds the answer and the source title.
6. The portal `/tickets` row shows the **WhatsApp** badge. The ticket page shows the AI answer, and the "This conversation is on WhatsApp" note replaces the composer.
7. Cookies cleared → Login → "Email me a code instead" → second code from mailhog → signed in → the ticket is listed.

### Not verified (needs real credentials)
- **WhatsApp against Meta:** creating the inbox with real `WHATSAPP_*` (Chatwoot validates against graph.facebook.com), Meta's webhook verification handshake (GET with `hub.verify_token`), real inbound delivery to a public Chatwoot URL, real outbound delivery and the 24-hour customer-service window, media messages, and template messages outside the window. Only text was exercised.
- **SMS:** msg91 and twilio are covered by unit tests with mocked `fetch` only. No real SMS was sent, and the msg91 DLT template id/variable name must match the real template.
- Each `make e2e` leaves the inbox "WhatsApp (e2e)" (+15550001234, fake token) in Chatwoot, and the next run reuses it. Outside e2e, Chatwoot's periodic template sync for it fails against the real Graph API, which only adds log noise. Delete it in Chatwoot settings if unwanted.

### Image size (api)
281 MB → 520 MB on disk (121 MB compressed): about 115 MB from the switch to `node:22-slim` (onnxruntime-node needs glibc) and about 125 MB of ML dependencies after pruning the other platforms' onnxruntime and the unused onnxruntime-web. The model (130 MB) lives in the `models` volume, not in the image.
