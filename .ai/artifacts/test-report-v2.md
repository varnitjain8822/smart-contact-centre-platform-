# Test Report — PLAN-v2 Phase 10 (QA), dev profile

Date: 2026-10-23 · Stack: compose project `smartcc`, **dev profile** + `docker-compose.e2e.yml` (Groq stub, mailhog) · Chatwoot http://localhost:3310, portal http://localhost:5273, api 127.0.0.1:4000, mailhog http://localhost:8025.
Scope: the prod profile (Caddy, Chatwoot production image) is parked by the user, so it was not built or tested. No real GROQ key exists, so every AI path ran against `e2e/groq-stub.mjs`.

Verdict: **PASS (dev)**. All suites are green. Four product bugs and two test-harness problems were fixed. Gaps are listed in §6.

## 1. E2E (Playwright + @axe-core/playwright 4.14, Chromium) — `make e2e`

| Spec | What it proves | Result |
|---|---|---|
| `demo.spec.ts` | register → payment ticket → AI auto answer with 1 source → This solved it → Resolved → CSAT 5. Chatwoot attributes, labels and priority are correct | ✓ |
| `handoff.spec.ts` | refund → draft tier → In progress. The agent replies through the Application API, the reply is live in the portal in ≤ 5 s, then the agent resolves and the customer gives CSAT | ✓ |
| `v2.spec.ts` › attachments | New ticket + `screenshot.png` (FileDrop) → the thread shows the thumbnail → the Chatwoot conversation has an `image` attachment (Application API) → the agent replies with `receipt.txt` (multipart) → the chip appears live in the portal → the customer downloads it and the bytes are identical | ✓ |
| `v2.spec.ts` › notifications | agent reply → bell shows "Notifications, n unread" → the popover lists the ticket → Mark all as read. Mailhog has the email: subject with the ticket number, ticket link in the body, and the `List-Unsubscribe` header | ✓ |
| `v2.spec.ts` › dashboard | the 4 stat cards equal `/api/me/overview` (open, AI handling, waiting on you, resolved 30 d); open/AI counts also equal the real ticket list; popular articles are listed; at 1440 px the Ask AI launcher covers nothing | ✓ |
| `v2.spec.ts` › /tickets | `q` search (text, and `sc1037` as an exact number), status chips (multi-select, `status=a,b`), the More filters priority checkbox, all in the URL and surviving a reload; Clear filters; sort `created` (newest first) and `priority` (high first) | ✓ |
| `v2.spec.ts` › transcript | ticket menu → Download transcript → `SC-xxxx-transcript.txt` holds the header, the `Attachment: screenshot.png (image/png …)` line and the agent reply | ✓ |
| `v2.spec.ts` › assistant | streamed answer (stub SSE) with a KB source chip and no `<<META` leak → an unsure answer → Convert to ticket → New ticket is prefilled (subject = first question, description = transcript) → submit | ✓ |
| `hindi.spec.ts` | Language → हिन्दी: `<html lang=hi>`, Hindi greeting, `locale:'hi'` saved on the account. KB article title in Hindi. The AI auto answer is in Hindi, with the "AI सहायक ने कहा:" label and Hindi action buttons. The draft hand-off system text is in Hindi. The assistant streams a Hindi answer | ✓ |
| `a11y.spec.ts` | 15 routes (login, register, help, help/:slug ×2, home, tickets, tickets?status=, new ticket, thread, notifications, assistant, profile, 404) × light/dark × 1440/1280/768/360 px. Axe wcag2a/aa/21a/21aa/22aa shows 0 serious/critical. `scrollWidth ≤ clientWidth` (no horizontal overflow, including 360 px). The Ask AI launcher covers no content once the page is scrolled to the end | ✓ |

The final full run passed 10/10 in 2.0 min. It ran green 3 times after the fixes. One run timed out on a11y at 300 s because the host was slow (its page checks took 5.3 min against the normal 1.7 min), so the budget is now 600 s.
Registration budget: there are exactly 5 registrations per run (a11y, demo, handoff, hindi, v2), against a limit of 5/h/IP. `make e2e` recreates `api` first.

## 2. Unit suites
- `cd api && npx vitest run` → **28 files, 175 tests passed**.
- `cd web && npx vitest run` → **7 files, 67 passed**. `npx tsc --noEmit` is clean, `npm run lint:strings` is ok (426 keys), and `npm run build` is ok.

## 3. Bugs fixed (minimal diffs + tests)

| # | Severity | Bug | Fix | Test |
|---|---|---|---|---|
| B1 | UX | On Home at 1440 px (and on every page at any width) the fixed Ask AI launcher sat over the bottom-right content, such as the "Looking for a quick answer?" card. | `AppShell` signed-in `<main>` bottom padding now clears the launcher: `pb-[calc(136px+safe-area)]` on mobile (tabs + launcher) and `md:pb-24`. | e2e `launcherCovers()` on every page × 4 widths, plus the dashboard spec |
| B2 | Serious (axe, WCAG 2.5.3) | `label-content-name-mismatch` on every page. The cases were: the language button (aria-label "Language: English", visible "EN"); the account button (visible initials); the lg search button (aria-label "Search", visible placeholder + ⌘K); and the Ask AI launcher (aria-label "Ask the AI assistant", visible "Ask AI"). | Language: the name is now `EN · Language: English`. Account: an sr-only name instead of aria-label. Search: the aria-label is dropped, so the visible text is the name. Launcher: the aria-label moved to `title`, so the visible "Ask AI" is the name. | e2e a11y, plus web `primitives.test.tsx` updated |
| B3 | Data | Overview: the 30 s per-user cache returned a stale dashboard right after the customer acted. A new user raising tickets then opening Home saw "Open 0" next to a list of 3 tickets. | The cache entry is keyed on the user's newest `Ticket.updatedAt` (one indexed `findOne`), so any ticket change refreshes it. The TTL still caps KB view counts. | `api/test/int/overview.test.js` (fresh after create; refresh after a ticket update) |
| B4 | Reliability | Bot webhook race in `findTicket`: when `createTicket` linked the conversation between the id lookup and the ticket_number claim, the claim matched nothing and the bot event was dropped. The AI answer then came only from the 60 s recovery sweep (60–90 s), and the e2e Hindi spec timed out once. | When the claim matches nothing, look up by conversation id again. The bot now logs `bot_ticket_not_found` instead of returning silently. | `webhook.test.js` "linked between the id lookup and the claim" (fails without the fix) |
| B5 | Ordering | Chatwoot REST returns `created_at` in whole epoch seconds. A fast bot answer stored at `x.000` sorted **above** the customer message it answered (seen 2 times in 15 stub tickets). | `upsertChatwootMessage`: numeric `created_at` → `min(now, s·1000+999)`. This value is never earlier than the true time. | `bot.test.js` (the AI message is not before the customer's). The fake Chatwoot now returns integer seconds, like the real one |

Test-harness fixes:
- `helpers.register`: `getByLabel('Password')` also matched the "Show password" toggle, so it now uses `exact: true`.
- `groq-stub.mjs`: the JSON (bot) mode answers in Hindi when the system prompt says `Reply in Hindi`, and it matches पेमेंट/भुगतान.
- Mailhog's parsed `Headers` drops folded headers, so `List-Unsubscribe` is asserted on `Raw.Data`.

## 4. Backup / restore (dev)
- `make backup` created `backups/20261023T073219Z/` with `mongo.archive.gz`, `chatwoot.pgdump`, `uploads.tar.gz` and `chatwoot-storage.tar.gz`, all mode 0600. `gzip -t` passed, and `pg_restore --list` showed 100 TABLE DATA entries.
- The restore was checked without touching live data. Mongo was restored into the scratch database `smartcc_verify`: tickets 68/68, users 43/43, messages 161/161, attachments 20/20 and notifications 41/41 all matched live, and the scratch database was then dropped. Postgres was restored into the scratch database `cw_verify`: conversations 69/69 and attachments 21/21 matched live, and the scratch database was then dropped.
- `make restore` was **not** run against live data.

## 5. Files changed
- web:
  - `src/features/shell/AppShell.tsx`, `TopBar.tsx`, `UserMenu.tsx`, `LanguageSwitch.tsx`
  - `src/features/assistant/Launcher.tsx`
  - `test/primitives.test.tsx`
- api:
  - `src/me/overview.js`, `src/tickets/service.js`, `src/ai/bot.js`
  - `test/helpers.js`, `test/int/overview.test.js`, `test/int/bot.test.js`, `test/int/webhook.test.js`
- e2e:
  - `groq-stub.mjs`
  - `tests/helpers.ts`, `tests/a11y.spec.ts`
  - new `tests/v2.spec.ts`, new `tests/hindi.spec.ts`

## 6. Gaps / not covered
- **Prod profile untested** (parked by the user): Caddy HTTPS, the Chatwoot production image, `api-prod`, `COOKIE_SECURE`, and the Lighthouse ≥ 90 and k6 p95 ≤ 500 ms goals.
- **Real Groq**: no key, so the AI first-response p95 ≤ 15 s check and real Hindi answer quality are untested.
- Hindi strings still need a native-speaker review (PLAN-v2 §5.2). A11y ran on English pages only.
- "The agent sees the attachment in Chatwoot" is verified through the Application API, not the Chatwoot dashboard UI.
- Not covered by e2e:
  - clicking the email unsubscribe link;
  - SLA-breach notifications;
  - the status-change email;
  - the 5-minute email throttle beyond the first mail;
  - full functional flows at 360 px (mobile is covered only by overflow, a11y and the launcher check);
  - the `/notifications` page with many items, and pagination.
- Known minor issue, not fixed: two filter clicks on /tickets within the same React transition can build on stale filters. React Router's `setSearchParams` is stale in both its value and its functional form. Humans don't click that fast, and the e2e waits for the rendered state.
- The restore drill used scratch databases only. A destructive `make restore` on a throwaway stack is still to do.

## 7. v3 gaps (2026-10-23)

Five gaps closed: agent typing indicator, server-side 👍/👎 (KB + assistant), Remember me, phone + organisation on the profile (synced to the Chatwoot contact), Sign out other devices. Endpoints in lld-backend §9 (E3', E5'', E32–E34, SSE `typing`).

| Suite | Result |
|---|---|
| `cd api && npx vitest run` | 29 files, **182 passed** (new `test/int/gaps.test.js`: typing relay + private/contact filtering + bad signature, KB vote upsert/counts/myVote, assistant feedback upsert/withdraw, remember cookie attributes, phone/org validation + Chatwoot push incl. Chatwoot down, logout-others) |
| `cd web && npx vitest run` | 8 files, **73 passed** (new `test/gaps.test.tsx`) · `tsc --noEmit` clean · `lint:strings` ok (445 keys) · `build` ok |
| `make e2e` | **15/15 passed** in 2.0 min; new `e2e/tests/gaps.spec.ts` (5 tests) |

`gaps.spec.ts`: remember-me cookie attributes (unticked → session cookie `expires -1`, ticked → ≥ 6.9 d; HttpOnly, Lax) · KB vote persists across reload and a second vote replaces the first · profile phone/org saved, reloaded, and read back from the Chatwoot contact (Application API) · agent `toggle_typing_status` → "<agent> is typing…" in ≤ 5 s, off hides it, private-note typing never shows · logout-others: a second browser context lands on /login after reload, this one stays signed in with a re-issued persistent cookie. a11y.spec (axe, 4 widths × 2 themes) covers the new login checkbox, profile fields and Devices section.

Notes:
- Registration is 5/h/IP and the older specs use all 5, so `gaps.spec.ts` registers its user directly against `127.0.0.1:4000` with its own `X-Forwarded-For` (api trusts one proxy hop) and signs in through the UI.
- Chatwoot phone numbers are unique per account: a clash makes the contact sync fail (logged, PATCH unaffected). The e2e uses a random number.
- After e2e the api was recreated without the stub (real Groq) and `smartcc-groq-stub-1` removed.
