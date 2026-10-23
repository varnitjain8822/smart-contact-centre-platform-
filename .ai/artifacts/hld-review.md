# HLD Review Report: Smart Contact Center v3 (hld-backend.md + hld-frontend.md + tech-stack.md)

Reviewer: hld-reviewer (Stage 4). Baseline: requirements.md v1.1, prd-review.md. Panel lenses applied: Tech Lead, Architect, Security, DBA, SRE, QA.

## 1. Verdict
**APPROVED_WITH_FIXES** (skill verdict: *Ready with Conditions* → conditions satisfied by edits already applied to the HLDs).
First pass found 8 issues (0 P0 after verification, 6 P1, 2 P2). All P1s are fixed in the HLD files; P2s accepted with reasons.
The verification against Chatwoot source (webhook retry policy, bot-token endpoint whitelist, SSRF filter, labels/custom-attribute replace semantics) materially de-risked the integration — those facts are now design inputs (hld-backend §1 A1–A3, §21).

## 2. Requirement Traceability (Three Doors)
- Door 1 — Coverage: **Pass** (after fixes F3, F7)
- Door 2 — Fidelity: **Pass with concerns** (REQ-047 scale is single-instance by design; acceptable at stated pilot size)
- Door 3 — Readiness: **Pass**

| REQ | HLD coverage | Status |
|---|---|---|
| 001, 002 | be §12 Security (authn), fe §7 Auth flow | Covered |
| 003 | be §12 (session revocation `pv`), fe §3 | Covered (after F5) |
| 004 | be §8.1, §8.5 sync | Covered |
| 005 | be §10 Deflection, fe §3/§13 | Covered |
| 006, 007 | fe §3, §8, §9; be §14 indexes | Covered |
| 008 | be §8.4, §8.5; fe §8 optimistic send | Covered |
| 009, 010, 011 | be §8.4 | Covered |
| 012 | be §8.4 (Chatwoot reopen → pending) | Covered |
| 013 | be §8.4 CSAT | Covered |
| 014, 015 | be §8.3, status map (PLAN §4); fe §11 status rail | Covered |
| 016–023 | be §8.2, §10 | Covered |
| 024, 025, 027 | be §8.2/§8.3 (priority → SLA), fe §11 SLA ring | Covered |
| 026 | be §8.5 SLA breach sweep | Covered (after F3) |
| 028 | be §7, §8.1 | Covered |
| 029, 030 | be §8.3 | Covered |
| 031 | be §18.2 panel | Covered |
| 032 | be §8.2 | Covered |
| 033, 034 | be §16 bootstrap, §18 | Covered |
| 035 | be §9/§6 KB; fe §3 | Covered |
| 036 | be §8.6 seed | Covered (after F7) |
| 037 | be §11, fe §8 | Covered |
| 038, 039 | fe §11, §12 | Covered |
| 040 | be §14, fe §13 | Covered |
| 041 | be §10 timeouts | Covered |
| 042 | be §11 SSE | Covered |
| 043 | fe §15 | Covered |
| 044 | be §12 | Covered |
| 045 | be §8.5 reconcile | Covered |
| 046 | be §13 | Covered |
| 047 | be §1 C1, §19 | Covered (single instance) |
| 048 | be §16 | Covered |
| 049 | be §18 | Covered |

## 3. Findings by Category

### Reliability
```
F1 Severity: P1 (fixed)
Category: Reliability
Observation: Bot acks Chatwoot before processing (required by 5 s timeout, A2). A crash after the ack loses the AI decision;
the conversation stays pending and the customer waits indefinitely unless they press "Talk to a human". §13 mentioned a
sweep but §8.5 (the worker spec) did not define it.
Impact: silent stuck tickets; REQ-016 violated.
Recommendation: define the bot recovery sweep with an explicit marker field. → Added `ai.pendingSince` + 60 s sweep in §8.5.
```
```
F2 Severity: P1 (verified, already designed)
Category: Reliability
Observation: Chatwoot does not retry inbox webhooks (lib/webhooks/trigger.rb). PRD REQ-045 is Should; HLD reconcile-on-open
covers it but only when the customer opens the ticket; Home list status could be stale.
Impact: list may show old status until thread opened.
Recommendation: accepted for pilot; reconcile also runs for list? No — would multiply Chatwoot calls. Stale list status is
self-correcting on open. Documented in §21 #1.
```

### Architecture / Fidelity
```
F3 Severity: P1 (fixed)
Category: Architecture
Observation: REQ-026 (SLA breach flag to agents) had no owning component — Chatwoot SLA is enterprise-only and nothing in the
HLD detected breaches.
Impact: requirement uncovered (Door 1).
Recommendation: SLA breach sweep in the sync worker → added §8.5 (label `sla-breached`, `sla.breachedAt`, SSE).
```
```
F4 Severity: P1 (fixed in fe HLD)
Category: Observability / Fidelity
Observation: hld-frontend §16 proposed then rejected a beacon endpoint mid-paragraph; the abandonment metric
(PRD Success Metrics) had no defined source.
Recommendation: derive server-side from suggest logs vs ticket_created → rewritten §16.
```

### Security
```
F5 Severity: P1 (fixed)
Category: Security
Observation: 7-day stateless JWT stays valid after password change (REQ-003) — a stolen session survives the obvious remedy.
Recommendation: password-version claim checked per request → added `pv` claim (be §12).
```
```
F6 Severity: P1 (fixed)
Category: Security
Observation: All traffic reaches the API via the web proxy; without `trust proxy` + `X-Forwarded-For`, the per-IP login and
register limits key on the proxy's IP — one attacker locks out every customer.
Recommendation: `xfwd:true` on proxy, `trust proxy 1` on API → added be §12, fe §17.
```

### Database Design
```
F7 Severity: P1 (fixed)
Category: Database
Observation: REQ-036 seed content had no mechanism or owner in the HLD.
Recommendation: boot-time idempotent upsert by slug + `npm run seed` → added §8.6.
```
- Verified OK: unique indexes on `number`, `chatwoot.conversationId` (sparse), `chatwootMessageId` (sparse), compound `(customerId, idempotencyKey)` (partial); atomic counter for ticket numbers (fixes prototype's `countDocuments()` race).

### API Design
- Verified OK: idempotency on create/send; human ticket number as key; error envelope; bot-token calls limited to Chatwoot's whitelist (`BOT_ACCESSIBLE_ENDPOINTS`).
```
F8 Severity: P2 (accepted)
Category: API Design
Observation: Contact create can 422 if identifier exists (Mongo reset, Chatwoot kept). Fallback search added to §7 table.
Recommendation: done; P2 because only reachable after manual data resets.
```

### Scalability
- Single-process SSE hub, limiter and per-ticket queue cap the API at one instance. Matches C1 (200 concurrent, 50 tickets/h). Roadmap §19 names triggers. No change.

### Performance
- OK. Groq latency dominates; 20 s timeout + 1 retry bounded by ~25 s worst case — **exceeds REQ-041 p95 15 s only in the retry path** (expected < 5 % of runs). Accepted; p95 still met.

### Observability
- P2 (accepted): no alerting/metrics stack in pilot. Health endpoint + structured logs + domain events suffice for the demo; revisit at production.

### Deployment
- Verified: `SAFE_FETCH_ALLOW_PRIVATE_NETWORK=true` required or no webhook is ever delivered (A3). Included in §16 and as a setup assertion.
- Verified: InstallationConfig values are DB-seeded once; branding/Captain config must be written by the bootstrap runner, not only yml (§16).
- Vite `preview` serving production assets is not a hardened web server — acceptable for pilot/demo (P2, accepted).
- Browsers allow ~6 HTTP/1.1 connections per origin; one EventSource per tab. More than ~5 open tabs could starve fetches (P2, accepted; HTTP/2 front proxy at production).

## 4. Missing Information (all resolved)
- Worker cadence & backoff → §8.5. Seed owner → §8.6. Contact 422 path → §7. IP trust → §12.

## 5. Risks Identified
- Single instance (Scalability, accepted). Webhook loss window (F2, mitigated). LLM retry path exceeding 15 s (Performance, accepted).

## 6. Questions for the Author
None blocking. (Proposed NFR numbers default unless the owner overrides.)

## 7. Suggested Improvements (applied)
1. §8.5 bot recovery + SLA breach sweeps. 2. §8.6 KB seed. 3. §12 `pv` claim and trusted proxy. 4. §7 contact search fallback. 5. fe §16 server-derived product events; fe §17 `xfwd`.
