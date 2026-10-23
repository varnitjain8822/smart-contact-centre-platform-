# Test Report — Stage 10 (QA)

Date: 2026-10-15 · Stack: docker compose project `smartcc` + `docker-compose.e2e.yml` (Groq stub) · Host ports: Chatwoot 3310, portal 5273, api 127.0.0.1:4000.
Verdict: **PASS**. Every automated suite is green. Two product bugs and one setup bug were found and fixed. Gaps are listed in §7.

## 1. Requirement documents used
requirements.md (PRD), hld-backend.md, hld-frontend.md, lld-backend.md (§test plan), lld-frontend.md, tasks.json (T51–T53), PLAN.md §9 (demo DoD). None missing.

## 2. Native backend tests (api, Vitest + supertest + mongodb-memory-server)
`cd api && npx vitest run` → **19 files, 127 tests passed** (≈28 s). One assertion was added to `test/int/bot.test.js`: a draft run with unchanged priority still calls `togglePriority(…, 'medium')`.

## 3. Frontend unit tests (web, Vitest + Testing Library, jsdom)
`cd web && npx vitest run` → **5 files, 41 tests passed**. Added:
- `components.test.tsx`: the conversation log contains a real list (`li` children of an `ol`).
- `components.test.tsx`: each bottom-tab's visible text is part of its accessible name (WCAG 2.5.3).

`tsc --noEmit` is clean.

## 4. E2E (Playwright 1.49 + @axe-core/playwright, Chromium) — see browser-report.md
| Spec | Requirements | Result |
|---|---|---|
| `demo.spec.ts`: register → "Payment deducted but plan inactive" → AI auto answer with 1 source → This solved it → Resolved → CSAT 5. The Chatwoot conversation has ticket_number, ai_tier=auto, ai_confidence=0.95, sla_due_at, csat=5, labels billing+ai-auto, priority high, status resolved | 001, 004, 009, 013, 016–019, 022, 028, 031 | ✓ 2.9 s |
| `handoff.spec.ts`: "Refund not received" → draft tier → In progress + system message. The conversation is open with ai_tier=draft, labels billing+ai-draft and priority medium. The agent (token from the `CW_AGENT_*` sign-in) replies via the Application API, and the reply shows in the portal within 5 s with no reload. The agent resolves → Resolved → CSAT 5 | 007, 010, 015, 017, 029, 030, 037, 042 | ✓ 2.2 s |
| `a11y.spec.ts`: 9 pages (/login, /register, /help, /help/:slug, /, /tickets/new, /tickets/:n, /profile, 404) × light/dark × 1280/360 px. Checks axe wcag2a/2aa/21a/21aa/22aa with 0 serious/critical violations, and `scrollWidth ≤ clientWidth` | 038, 039, 043 | ✓ 29 s |

The final run passed 3 of 3 specs in 34.6 s. It was run three times after the fixes, green each time.

## 5. Manual verification (Chatwoot Application API, admin token read from .env, never printed)
For the handoff conversation (`SC-1013`), the message log is:
1. Incoming contact message.
2. Activity "SmartCC AI set the priority to medium".
3. Activity "added billing, ai-draft".
4. **Private** agent_bot note "AI draft (confidence 70%) — review before sending: …".
5. Activity "reopened by SmartCC AI" (bot hand-off).
6. Public agent reply.
7. Activity "marked resolved by Demo Agent".
8. Private "CSAT 5/5".

The custom attributes `{ticket_number, sla_due_at, ai_tier, ai_confidence, csat}` are all present. These are exactly the fields that `PortalTicketPanel.vue` reads, so the panel has its data (REQ-031/032).

## 6. Bugs found and fixed
| # | Severity | Requirement | Bug | Fix | Regression test |
|---|---|---|---|---|---|
| B1 | High (demo blocker) | 029, 048 | `chatwoot-setup.mjs` never added agents to the "Customer Portal" inbox. The demo agent saw 0 conversations, so it could not reply or resolve in Chatwoot. | Step 4b: `POST /inbox_members {inbox_id, user_ids: all agents}`. The call is idempotent because Chatwoot adds only missing ids. Setup was re-run on the live stack. | e2e handoff (the agent token finds the conversation) |
| B2 | Medium | 017 | The bot only called `togglePriority` when the AI changed the priority. Conversations start with no priority, so a ticket that stayed `medium` showed no priority to agents. | `api/src/ai/bot.js`: always set the priority. This is idempotent: Chatwoot `toggle_priority` simply assigns the value. | `api/test/int/bot.test.js` draft case; e2e handoff `priority === 'medium'` |
| B3 | Serious (axe) | 043 | `Thread.tsx` put `role="log"` on the `<ol>`, which removed the list semantics and left the `<li>` items orphaned (axe `listitem`). | Moved `role="log"`/`aria-live` to a wrapping `<div>`. | web components test; e2e a11y |
| B4 | Serious (axe) | 043 | Bottom tab "Home" had `aria-label="My tickets"`, so the visible label was not in the accessible name (WCAG 2.5.3 `label-content-name-mismatch`). | The visible short label is now "Tickets". | web components NAV test; e2e a11y |

## 7. Coverage gaps (no automated test)
- REQ-033 branding and REQ-049 customisation boundary: manual or review only.
- REQ-034 agent AI assist (Captain Tasks): not exercised.
- REQ-040 performance and REQ-047 scale (200 concurrent): no load or perf run.
- REQ-041 AI latency: only measured against the deterministic stub, not real Groq.
- REQ-012 reopen-by-message and REQ-014 status timeline: covered at the api level only, with no e2e.
- REQ-031 panel UI: the fork spec `chatwoot/.../specs/PortalTicketPanel.spec.js` was not re-run here. The data behind it was verified via the API (§5).
- The SSE reconnect path of REQ-037 has no e2e coverage.

## 8. Environment notes / recommendations
- Registration is rate-limited to 5/h per IP and the limiter is in memory. Each e2e run uses 3 registrations, so recreate `api` between runs. This is documented in the README.
- `chatwoot/core` is a 3.6 GB ELF core dump from a crashed `vite build --mode development` node process in the Chatwoot `vite` container. It was written at 23:53, during QA, and is not caused by any QA code change. It was left in place; delete it if not needed.
- Manual exploratory testing is still recommended for:
  - the Chatwoot UI panel rendering;
  - agent private notes never reaching the customer UI;
  - real Groq output quality on the 11 seeded articles.
