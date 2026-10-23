# PRD Review: Smart Contact Center v3 — requirements.md

**Reviewer:** prd-reviewing (Stage 2)
**Review Date:** 2026-10-15
**PRD Version:** 1.0 reviewed → 1.1 after fixes
**PRD Author:** prd-generator (Stage 1), source PLAN.md

---

## Summary

**Status:** APPROVED_WITH_FIXES

**Overall Assessment:**
v1.0 had the right shape (personas, flows, MoSCoW, EARS) but left four failure behaviours undefined (agent workspace
down at submit, missed agent replies, AI answer loops, AI citing unprovided articles) and two rules ambiguous (SLA
"at risk", reopen destination). All were fixed in v1.1 as named business rules. Remaining items are MINOR and accepted.

---

## Findings by Severity

### Blockers
- None.

### Critical (fixed in v1.1)
- [x] **REQ-004 / Flow 1** — no behaviour when the agent workspace is unreachable at ticket submit; ticket would be lost or the customer shown an error for a backend problem. → Added "Queued" state + **BR-SYNC-1** (retry 30 s × 20, then every 5 min, visible "Delayed").
- [x] **REQ-029** — agent-workspace notifications to the portal are fire-and-forget (confirmed in Stage 3 research: inbox notifications are not retried on failure). Replies sent while the portal is down would never reach the customer. → Added **REQ-045** thread self-heal (Should) and Flow 2 error branch. Rated Should because the demo path has the portal up; risk logged.

### Major (fixed in v1.1)
- [x] **REQ-023** — AI could auto-answer indefinitely on repeated "didn't work" replies. → **BR-AI-4** loop guard (2 autos then human).
- [x] **REQ-018** — "grounded" was untestable; nothing stopped citing an article not retrieved. → Criterion: only provided articles may be cited; otherwise no auto send.
- [x] **REQ-020** — risk detection relied entirely on the AI; an AI miss would auto-answer a fraud case (violates G4). → Union of AI triggers and fixed keyword list (**BR-AI-2**).
- [x] **REQ-025** — "At risk" undefined. → **BR-SLA-2** (≤ 25 % of active window).
- [x] **REQ-012** — reopen target status ambiguous (AI or human?). → **BR-ST-2**.
- [x] **REQ-013** — CSAT behaviour across reopen undefined. → One rating per ticket; second attempt rejected (explicit criterion).
- [x] **REQ-020 vs agent control** — trigger floor could fight agent priority changes. → Floor applies to AI only (Edge Cases).

### Minor (accepted)
- [ ] **Success Metrics** — no baselines (prototype has no production data). Accepted; targets marked `[PROPOSED]`.
- [ ] **NFR numbers** — several `[PROPOSED]`. Accepted; defaults apply unless the owner overrides (non-blocking Open Question).
- [ ] **Constraints** names products (agent workspace, AI provider). Accepted: they are PLAN.md decisions, isolated to Constraints.
- [ ] **SLA keeps running while "Waiting on you"** — common help desks pause. Explicitly Out of Scope; acceptable for pilot.

---

## Section Ratings

| Section | Rating | Notes |
|---|---|---|
| Problem Statement | Adequate | Evidence = prototype seed data only (A1) |
| User Stories | Strong | Formal stories for 3 personas |
| Acceptance Criteria | Strong (after fixes) | EARS, rule references, numeric bounds |
| Scope | Strong | MVP/Future/Out mutually exclusive; every REQ placed once |
| Success Metrics | Adequate | Metric→event table present; no baseline |

## Strengths
- Tier rule written as an ordered decision list (BR-AI-1) — directly unit-testable.
- Status map and SLA targets reuse proven prototype values.
- Domain invariants gate run; SLA pause excluded with a reason rather than forgotten.

## Risks Identified
1. Hosted-AI rate limits under burst — Mitigation: REQ-021 fallback; design must make fallback cheap.
2. Prompt injection inside ticket text steering the tier — Mitigation: tier/citation rules enforced outside the AI (to verify at HLD).
3. Single-tenant assumption (A2) — Mitigation: documented; multi-tenant is out of scope.

## Questions for Author
1. Confirm `[PROPOSED]` NFR numbers (non-blocking; defaults used).

## Recommendation
Proceed to HLD with v1.1. HLD must show: deferred sync mechanism (BR-SYNC-1), reconcile path (REQ-045), per-ticket
serialisation of AI decisions (BR-AI edge case), and authenticity checks on both inbound notification paths (REQ-044).
