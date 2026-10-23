# LLD Review — Stage 6 (fullstack: `lld-reviewer` on lld-backend.md, `frontend-lld-review` on lld-frontend.md, plus lld.md)

**Overall status: APPROVED_WITH_FIXES.** First pass: backend **Not Ready** (0 P0, 7 P1, 2 P2), frontend **Ready with Conditions** (0 🔴, 4 🟡). Every P1/🟡 was fixed in the LLD files during this stage; the re-review below is against the fixed text.

---

# Part A — LLD Review Report: portal-api (lld-backend.md)

## 1. Verdict
**Ready for Implementation** (after fixes). First pass found 7 P1 + 2 P2 → Not Ready under the zero-tolerance rule; all 7 P1 fixed in-document, re-review: 0 P0 / 0 P1 / 2 P2 (≤ 2 allowed).

## 2. Baseline Confirmation
- PRD referenced: yes (v1.1) · HLD referenced: yes (post-review) · API Contract: yes (§4 is the contract; cross-checked in lld.md)
- Guardrails: not applicable (no project guardrails doc; tech-stack.md used as constraint list)
- Manifest present: yes — 15 Included, 3 Excluded with PRD/HLD reasons.

## 3. Gate Results
- **Gate 0 — Baseline & Manifest: Pass.** No new boundary beyond HLD modules (OA4).
- **Gate 1 — Consistency & Drift: Pass (after fixes).**

| Drift | Where | Type | Status |
|---|---|---|---|
| First message body was `subject + description`; PRD REQ-004 says description is the first message | §6.2 create | Deformation | Fixed: Mongo message = description; Chatwoot content = subject + description |
| HLD §8.5 bot recovery depends on `ai.pendingSince`; LLD never set it for a new ticket's first message | §6.2 create | Omission | Fixed: set at create |
| HLD §13 "state-not-transition updates"; bot's final status-guarded update could be discarded by its own echoed status webhook | §6.5 bot run | Degradation | Fixed: decision persisted first, status moved before `toggle_status` |

- **Gate 2 — Module Completeness: Pass (after fixes).** Per-module: config ✔ · http infra ✔ (assembly order added) · models ✔ (pendingActions added) · auth ✔ · tickets ✔ · sla ✔ · kb ✔ · chatwoot ✔ · ai ✔ · realtime ✔ · sync ✔ · seed ✔ · setup ✔ · fork UI ✔ (planning-level spec; Vue SFC is ≤ 80 lines).
- **Gate 3 — Implementability: Pass.** Pseudocode with exception branches for create/sync/send/accept/handoff/resolve/rate/webhooks/bot/worker/reconcile. Implementability score: all modules *Fully specified*; Chatwoot fork panel *Specified with gaps* (P2-2).

## 4. Findings

```
F1 Severity: P1 (fixed)
Gate: Consistency & Drift — Deformation
Observation: §6.2 create stored `${subject}\n\n${description}` as the first customer message; PRD REQ-004 requires the description.
Impact: thread shows duplicated subject; acceptance test on first bubble fails.
Recommendation/Fix: description only in Mongo; subject+description only in the Chatwoot conversation opener.
```
```
F2 Severity: P1 (fixed)
Gate: Module Completeness — Concurrency & State
Observation: §6.5 bot run did the status-guarded `updateOne({status:'ai_handling'})` AFTER `toggle_status open`. Chatwoot's
`conversation_status_changed` echo can be applied first (status → in_progress), making the bot's update match 0 and silently
dropping tier, triggers, confidence and summary.
Impact: Portal ticket panel/ticket missing AI data; REQ-017 violated intermittently.
Fix: step 1 persists decision fields unconditionally; step 2 moves status (guarded) before Chatwoot calls; auto bookkeeping guarded separately.
```
```
F3 Severity: P1 (fixed)
Gate: Module Completeness — Concurrency & State
Observation: `ai.pendingSince` was set only "if null" by the bot webhook and cleared unconditionally at the end of a run. A customer
message arriving mid-run would not bump the marker, then be cleared → its own queued run exits early → message never answered.
Fix: handlers always `$set pendingSince=now`; run clears only `pendingSince ≤ runStart`; run exits early when `pendingSince` is null (dedupes sweep + webhook double runs).
```
```
F4 Severity: P1 (fixed)
Gate: Consistency & Drift — Omission
Observation: early return for unsynced tickets cleared `pendingSince`, so a ticket created while Chatwoot was down would never get
an AI decision after the worker synced it (the bot webhook may be missed if api restarted).
Fix: unsynced → return without clearing; sweep picks it up 60 s after sync.
```
```
F5 Severity: P1 (fixed)
Gate: Module Completeness — Data Access
Observation: `chatwoot.pendingActions` used by §6.2/§6.3 was missing from the §2.2 schema table.
Fix: added with enum and default.
```
```
F6 Severity: P1 (fixed)
Gate: Module Completeness — Configuration
Observation: middleware order unspecified; a global `express.json()` before the webhook routes consumes the body and breaks HMAC verification (signature computed over exact bytes).
Fix: §4.8a App assembly order with raw parser mounted first, plus boot sequence.
```
```
F7 Severity: P1 (fixed)
Gate: Module Completeness — Error Handling
Observation: in §6.5 the draft/human path clears `pendingSince` and moves the ticket to in_progress before the Chatwoot calls;
the catch branch then claimed "the recovery sweep re-runs", but the sweep only selects ai_handling tickets — a failed
`toggle_status open` would leave Chatwoot pending (bot-owned, invisible in agents' Open queue) forever.
Impact: hand-off silently lost; violates REQ-010/REQ-021 intent (customer always reaches a human).
Fix: failure adds `chatwoot.pendingActions:'handoff'`; worker replays note + `toggle_status open` (bot token) until accepted.
```
```
P2-1 Severity: P2 (accepted)
Gate: Implementability
Observation: residual duplicate-conversation risk if Chatwoot create succeeds and the Mongo write fails (§6.2 syncTicket). Logged as evt.
Reason accepted: requires Mongo failure in a ~ms window; ticket_number custom attribute makes duplicates findable by agents.
```
```
P2-2 Severity: P2 (accepted)
Gate: Implementability
Observation: Portal ticket panel (HLD §18.2) is specified by file, data source and fields but not as component code.
Reason accepted: 1 SFC reading 5 custom attributes with existing AccordionItem; planning task carries exact acceptance checks.
```

## 5. Missing Information — none outstanding.
## 6. Questions for the Author — none blocking.
## 7. Suggested Improvements (applied) — F1–F7 edits listed above; E10 query order made explicit (newest 500, returned oldest-first).

---

# Part B — Frontend LLD Review Report: customer portal (lld-frontend.md)

## 1. Verdict
**Ready for Implementation** (first pass: Ready with Conditions; 4 🟡 fixed in-document + 5 contract fixes from lld.md).

## 2. Requirement Traceability (Three Doors)
Defining constraints: (1) **live thread correctness** — optimistic send + SSE + reconnect must never duplicate or lose messages; (2) **mobile-first accessibility** of a chat surface; (3) **never blocking the customer** on AI/backend failure.
- Door 1 Coverage: **Pass** — FR1–FR12 map every customer-facing REQ (001–015, 022, 025, 035, 037–039, 043, 045).
- Door 2 Fidelity: **Pass** — matches HLD decisions (CSR, Query, SSE at shell, tokens, `<dialog>`).
- Door 3 Readiness: **Pass** after fixes.

## 3. Findings by Category

**State management / Data layer**
```
Severity: 🟡 (fixed in lld.md pass)
Category: API & Data Layer
Observation: cache-shape mismatches between live handler and hooks (`{ticket}` vs TicketDetail; `{items}` vs array) and append-only SSE handling.
Impact: live updates would crash or duplicate.
Fix: select-based `useTicket`, `items` array cache, `upsertMessage` by id/clientMessageId (lld.md A–E).
```
**Component architecture**
```
Severity: 🟡 (fixed)
Category: Component Architecture
Observation: Composer `disabled` semantics undefined; a natural implementation disables it on resolved tickets, which removes REQ-012 reopen.
Fix: enabled in every status; reopen placeholder.
```
**Edge cases / UI states**
```
Severity: 🟡 (fixed)
Category: Edge Cases & Resilience
Observation: loading/empty/error states were spread across sections; no per-view table; AI "thinking" state absent, leaving a silent gap of up to 15 s after submit.
Fix: §15a UI States table incl. "AI assistant is reviewing…" row and countdown formatting rules.
```
**Security**
```
Severity: 🟡 (fixed)
Category: Security / Auth boundary
Observation: global 401 redirect would bounce signed-out users off public Help pages.
Fix: `['me']` excluded from the global handler (lld.md A).
```
**Verified OK (no finding):** XSS (text-only rendering, no HTML injection), token storage (HttpOnly cookie), race handling on suggestion (AbortSignal via query cancellation), virtualization not needed (≤ 500 bounded, typically < 50), reduced motion, focus management on route change and dialogs, colour-not-alone for SLA/status, safe-area + keyboard handling for composer, cross-tab logout.
**Not applicable:** offline-first sync (not required), embeddable widget isolation, feature flags, i18n/RTL (out of scope).

## 4. Missing Information — none outstanding.
## 5. Risks Identified — SSE buffering via Vite preview (e2e asserts live update); per-origin connection cap with many tabs (accepted).
## 6. Questions for the Author — none.
## 7. Suggested Improvements — applied (above).

## What is genuinely good
Single cache as truth for live data; idempotency keys at both create and send make optimistic UI safe; tokens are contrast-verified numbers, not adjectives; native `<dialog>`/radios avoid custom a11y work.

---

# Part C — lld.md (5c) re-check
Re-verified after Part A/B edits: no backend contract field changed in Stage 6 (fixes were internal), so lld.md remains valid.
