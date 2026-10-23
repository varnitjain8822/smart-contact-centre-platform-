---
title: "Smart Contact Center v3 — Customer Support Portal with AI-first Triage"
status: approved-pending-gate
version: "1.1"
scope: fullstack
source: PLAN.md (approved direction, "docs once, then build"); interview skipped by user choice — answers taken from PLAN.md
---

# Product Requirements Document

> **Tech-Agnostic Rule:** this document states WHAT and WHY. Product names that appear are limited to the
> Constraints section, where they record decisions already fixed in PLAN.md. Everything else is phrased as
> observable behaviour. `scope: fullstack` (customer-facing web experience + service + agent-workspace integration).

## Validation Checklist

### CRITICAL GATES (Must Pass)

- [x] All required sections are complete
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Domain Invariants Gate has been run (Supporting Research → Domain Invariants) and every item resolved
- [x] No Must-Have feature's acceptance criteria depend on an unresolved Open Question (Open Questions list has none marked BLOCKING)
- [x] Problem statement is specific and measurable
- [x] Every feature has testable acceptance criteria (EARS format)
- [x] Every primary user flow has a happy path, at least one alternate path, and at least one error path
- [x] No contradictions between sections; rules live in Detailed Feature Specifications (BR-x) and are referenced, not restated
- [x] No technology/implementation detail outside Constraints

### QUALITY CHECKS (Should Pass)

- [x] Problem validated by evidence — partially: evidence is the reference prototype and PLAN.md decisions; logged as Assumption A1
- [x] Context → Problem → Solution flow makes sense
- [x] Every persona has at least one user flow
- [x] MVP / Future / Out of Scope mutually exclusive (see Scope sections; each REQ appears once)
- [x] Every NFR number has a basis or `[PROPOSED: pending eng confirmation]`
- [x] Every metric has a tracking event (Metric-to-Event table printed)
- [x] No feature redundancy
- [x] Engineering Digest matches detailed sections
- [x] Glossary provided for domain terms

---

## Engineering Digest

**Features at a glance** (ID → one line; MoSCoW in brackets)

| ID | Feature | Pri |
|---|---|---|
| REQ-001 | Customer registration with name, email, password | Must |
| REQ-002 | Sign in / sign out; session persists 7 days | Must |
| REQ-003 | Profile: edit display name, change password, theme preference | Should |
| REQ-004 | Raise a ticket (subject, description, optional category); duplicate-submit safe; queued if agent workspace unreachable | Must |
| REQ-005 | Live "possible answer" with help-article sources while composing a ticket (deflection) | Should |
| REQ-006 | Home: my open tickets with status, priority, SLA countdown; switch to resolved/all | Must |
| REQ-007 | Ticket thread: chat-style, live, ordered, author-labelled | Must |
| REQ-008 | Customer follow-up message on a ticket | Must |
| REQ-009 | "This solved it" — accept an AI answer and resolve | Must |
| REQ-010 | "Talk to a human" — hand an AI-handled ticket to an agent | Must |
| REQ-011 | Customer closes (resolves) a ticket | Must |
| REQ-012 | Reopen a resolved ticket by sending a new message | Must |
| REQ-013 | CSAT 1–5 with optional comment after resolution, visible to agents | Must |
| REQ-014 | Status timeline on the ticket | Should |
| REQ-015 | Four customer-facing statuses mapped from agent-side state | Must |
| REQ-016 | AI first response on every new ticket | Must |
| REQ-017 | AI classification: intent, category, priority, confidence, risk triggers | Must |
| REQ-018 | AI answers grounded only in help-center articles, with cited sources | Must |
| REQ-019 | Three-tier decision: auto-answer / draft-for-agent / human | Must |
| REQ-020 | Risk triggers always force human handling | Must |
| REQ-021 | AI failure or unavailability falls back to human handling | Must |
| REQ-022 | AI messages visibly badged with their sources | Must |
| REQ-023 | AI answers follow-ups while the ticket is still AI-handled; loop guard | Must |
| REQ-024 | SLA targets per priority (first response + resolution) | Must |
| REQ-025 | SLA state chip + countdown (On track / At risk / Breached / Met) | Must |
| REQ-026 | SLA breach flagged to agents in their workspace | Should |
| REQ-027 | SLA due times recomputed when priority changes | Must |
| REQ-028 | Every ticket appears in the agent workspace with ticket number, customer identity, first message | Must |
| REQ-029 | Agent public replies reach the customer live; internal notes never do | Must |
| REQ-030 | Agent status / priority / category changes reflected on the ticket | Must |
| REQ-031 | Agent sees a "Portal ticket" panel: ticket number, SLA due, AI tier, AI confidence, CSAT | Must |
| REQ-032 | AI draft and AI hand-off summary visible to agents as internal notes | Must |
| REQ-033 | Agent workspace carries the product brand | Could |
| REQ-034 | Agent AI assist (summarise conversation, suggest reply) | Could |
| REQ-035 | Help Center: browse by category, search, read article | Must |
| REQ-036 | Help Center ships with ≥10 seeded articles covering top contact reasons | Must |
| REQ-037 | Live updates without refresh; auto-reconnect; catch-up after reconnect | Must |
| REQ-038 | Light and dark theme; follows system by default; manual override | Must |
| REQ-039 | Mobile-first layout usable from 360 px width | Must |
| REQ-045 | Thread self-heals: replies missed while the portal was unreachable appear on next open | Should |

**Non-functional (also traced):** REQ-040 performance, REQ-041 AI latency, REQ-042 reply propagation latency, REQ-043 accessibility, REQ-044 security & privacy, REQ-046 reliability/idempotency, REQ-047 scale, REQ-048 one-command startup, REQ-049 agent-workspace customisation boundary.

**Hard numbers**

| Target | Value | Basis |
|---|---|---|
| SLA first response / resolution — Critical | 15 min / 120 min | Reference prototype SLA engine (`SLA_TARGETS_MINUTES`) |
| — High | 60 min / 240 min | same |
| — Medium | 240 min / 720 min | same |
| — Low | 1440 min / 2880 min | same |
| SLA "At risk" threshold | ≤ 25 % of the active window remaining | `[PROPOSED: pending eng confirmation]` |
| AI tier thresholds | auto > 0.85, draft 0.60–0.85, human < 0.60 | PLAN.md §2 / reference prototype |
| AI first response p95 | ≤ 15 s from ticket submit | `[PROPOSED: pending eng confirmation]` — hosted model latency 1–4 s + retrieval + one retry |
| Agent reply → customer screen p95 | ≤ 5 s | `[PROPOSED]` — chat-product norm |
| Portal first meaningful screen | ≤ 2.5 s on mid-range phone, 4G | Web-vitals "good" LCP threshold |
| Service response p95 (non-AI) | ≤ 300 ms | `[PROPOSED: pending eng confirmation]` |
| Concurrent customers with live updates | 200 | `[PROPOSED]` — demo/pilot sizing |
| Ticket volume | 50 new tickets / hour peak | `[PROPOSED]` — pilot sizing |
| Session length | 7 days | `[PROPOSED]` — consumer support norm |
| Sign-in attempts | 10 per 15 min per email+network origin | `[PROPOSED]` — brute-force guard |
| Deflection suggestion | appears ≤ 3 s after typing pauses | `[PROPOSED]` |

**Must-Haves with unresolved dependencies:** None.

**Estimation Blockers:** None blocking. EB-1 (agent-workspace build time/memory) is a known cost, not an unknown — see Estimation Blockers.

---

## Executive Summary

Smart Contact Center v3 gives customers one place to raise and follow support tickets, read help articles, and get an
immediate, source-cited AI answer. Every ticket is mirrored into the support team's agent workspace, where an AI
assistant answers first and hands off to humans by a fixed three-tier confidence rule, always escalating on fraud,
legal, security, anger and similar risk signals. Agent replies and status changes flow back to the customer live.
It replaces a single-file prototype whose agent screens and keyword "AI" are retired in favour of a production agent
workspace and a real language model. Success is the end-to-end demo in PLAN.md §9 plus measurable deflection and CSAT.

## Problem Statement

### Context
A B2B/SMB support operation (commerce, billing, compliance, logistics questions — see seeded help topics) currently has
a prototype that bundles customer, agent and admin screens in one application with keyword matching labelled as AI.

### Problem
1. Customers wait for a human even for questions already answered in help articles (password resets, pending payments,
   invoice downloads). The prototype's own seed data shows 6 of 8 sample tickets map directly to an existing article.
2. Agents work in a home-grown queue lacking the routing, reporting and collaboration features of a mature agent workspace.
3. The prototype's "AI" is keyword rules; it cannot ground answers, cite sources, or reliably detect risk.
4. Customers have no live view: they must refresh to see replies, and SLA promises are invisible.

### Why Now
A production agent workspace and an inexpensive hosted language model are both available (PLAN.md §5), making the
prototype's custom agent tooling dead weight. Rebuilding now avoids investing further in throwaway screens.

## Goals

### Product Goals
- G1: Customers get a correct, cited answer immediately when one exists, and a human when it doesn't or when risk is present.
- G2: Customers always know where their ticket stands (status, promised response time) without refreshing.
- G3: Agents work entirely in the agent workspace with full ticket context; nothing requires a second tool.
- G4: Risky conversations (fraud, legal, security, anger, disputes) never get an unsupervised AI reply.

### Non-Goals
- Building agent/admin screens in the portal (the agent workspace owns them).
- Replacing human judgement on escalations.
- Multi-tenant SaaS onboarding for many companies.

## Stakeholders

| Stakeholder | Role | Interest / Stake | Approval Needed? |
|---|---|---|---|
| Product owner (user of this pipeline) | Sponsor, approver | Demo in PLAN §9 works; docs-once-then-build | Yes |
| Support agents | Daily users of agent workspace | Context-rich tickets, drafts they can trust | No |
| Support admin | Configures workspace, KB | Low maintenance, upgradeable workspace | No |
| Customers | Portal users | Fast answers, transparency | No |
| Compliance / risk | Indirect | Risky cases never auto-answered (G4) | No |

## User Personas

### Primary Persona: Priya — small-business owner (customer)
- **Demographics:** 28–50, runs an MSME trading/export business, moderate technical skill, mostly on phone.
- **Goals:** fix billing/account/compliance blockers fast; know when someone will respond.
- **Pain Points:** generic auto-replies, no visibility, repeating herself, having to refresh.
- **Formal User Stories:**
  - As Priya, I want to describe my problem once, so that I get an answer or a human without repeating it.
  - As Priya, I want to see the AI's sources, so that I can trust or verify its answer.
  - As Priya, I want to see a live countdown to the promised response, so that I know when to expect help.
  - As Priya, I want to ask for a human at any point while the AI is handling my ticket, so that I am never stuck with a bot.
  - As Priya, I want to rate the help I got, so that the company knows how it did.

### Secondary Persona: Arjun — support agent
- **Demographics:** 22–40, full-time agent, high technical comfort with support tools, desktop.
- **Goals:** resolve within SLA, reuse good AI drafts, see risk flags.
- **Pain Points:** missing context, unknown SLA, unclear why a ticket reached him.
- **Formal User Stories:**
  - As Arjun, I want each handed-off ticket to show the AI's summary, triggers and draft, so that I start with context.
  - As Arjun, I want to see the portal ticket number, SLA due time, AI tier and CSAT beside the conversation, so that I prioritise correctly.
  - As Arjun, I want my replies to reach the customer instantly, so that conversations feel live.

### Secondary Persona: Meera — support admin
- **Demographics:** 30–45, owns tooling and the help center.
- **Goals:** one-time setup, upgradeable workspace, brandable.
- **Formal User Stories:**
  - As Meera, I want setup to be a single repeatable step, so that new environments are consistent.
  - As Meera, I want the agent workspace to carry our brand, so that agents and customers see one product.

---

## User Flows

### Flow 1: Raise a ticket and get an AI answer (Priya)
- **Trigger:** Priya has a problem. **Preconditions:** signed in (REQ-002).

**Main Flow**
1. Priya opens "New ticket", types subject and description → System shows a possible answer with sources once she pauses (REQ-005).
2. Priya submits anyway → System confirms with ticket number and opens the thread showing status "AI handling" and the SLA chip (REQ-004, REQ-025).
3. AI replies in the thread with a badged, sourced answer (REQ-016, REQ-022), per BR-AI-1 tier "auto".
4. Priya taps "This solved it" → ticket becomes Resolved and a rating prompt appears (REQ-009, REQ-013).
5. Priya rates 5 → System thanks her; the agent workspace shows the rating (REQ-031).

**Alternate Flows**
- **A — deflected before submit:** at step 1 the suggestion answers her question; she leaves without submitting. No ticket is created; a deflection event is recorded.
- **B — draft tier:** at step 3 no public AI reply appears; the thread shows "Passed to our team" and status "In progress" (BR-AI-1 draft).
- **C — risk detected:** description mentions "hacked" and "unauthorized charge" → status "In progress", priority Critical, SLA 15 min (BR-AI-2, BR-SLA-1).
- **D — talk to a human:** after step 3 she taps "Talk to a human" → status "In progress" (REQ-010).
- **E — follow-up while AI-handled:** she replies "didn't work" → AI answers again or hands off (REQ-023, BR-AI-4).

**Error Flows**
- **If the agent workspace is unreachable at submit** → ticket is saved and shown as "Queued — our team will see it shortly"; delivered automatically when reachable (REQ-004, BR-SYNC-1).
- **If the AI is unavailable** → ticket goes to humans; thread shows "Passed to our team" (REQ-021).
- **If submission fails validation** → field-level messages; nothing lost from the form.
- **If she double-taps submit** → exactly one ticket is created (REQ-004).

**Postconditions:** a ticket exists, mirrored to the agent workspace, in exactly one of the four statuses.

### Flow 2: Agent works a handed-off ticket (Arjun)
- **Trigger:** ticket enters the agent queue. **Preconditions:** Flow 1 branch B/C/D or AI fallback.

**Main Flow**
1. Arjun opens the conversation → sees Portal ticket panel (number, SLA due, AI tier, confidence) and the AI internal note (draft or summary + triggers) (REQ-031, REQ-032).
2. Arjun edits the draft and sends a public reply → Priya sees it within the latency target without refreshing (REQ-029, REQ-042).
3. Arjun resolves → Priya's ticket shows Resolved and asks for a rating (REQ-030, REQ-013).

**Alternate:** Arjun raises priority → Priya's SLA chip recomputes (REQ-027). Arjun snoozes awaiting Priya → status "Waiting on you" (REQ-015). Arjun adds an internal note → Priya never sees it (REQ-029).
**Error:** portal unreachable when Arjun replies → reply appears in Priya's thread next time she opens the ticket (REQ-045).
**Postconditions:** ticket status equals mapped workspace status.

### Flow 3: Reopen and rate (Priya)
1. Resolved ticket, Priya sends "issue is back" → ticket reopens to "AI handling" (or "In progress" if humans already own it — BR-ST-2) (REQ-012).
**Alternate:** rating before reopen stays recorded. **Error:** rating twice → "You have already rated this ticket".

### Flow 4: Help Center self-service (Priya)
1. Opens Help → categories with article counts → searches "invoice" → reads article (REQ-035).
**Alternate:** no results → suggestion to raise a ticket with the search text prefilled. **Error:** article removed → "Article not found" with link back.

### Flow 5: Environment setup (Meera)
1. Runs the single startup command, then the one-time setup step → agent workspace has the portal inbox, AI assistant attached, custom fields, category labels (REQ-048).
**Alternate:** re-running setup changes nothing already present (idempotent). **Error:** missing AI key → system still works, every ticket goes to humans (REQ-021).

---

## Functional Requirements

Acceptance criteria reference Business Rules (BR-x) in Detailed Feature Specifications instead of restating them.

### Must Have Features

#### REQ-001 Registration
- **User Story:** As Priya, I want to create an account, so that my tickets are private to me.
- [ ] WHEN a visitor submits name (2–80 chars), a valid email and a password (8–128 chars), THE SYSTEM SHALL create the account and sign the visitor in.
- [ ] IF the email is already registered (case-insensitive), THEN THE SYSTEM SHALL reject with "An account with this email already exists" and create nothing.
- [ ] THE SYSTEM SHALL never display or return a stored password.

#### REQ-002 Sign in / sign out
- **User Story:** As Priya, I want to sign in once on my phone, so that I don't re-enter credentials daily.
- [ ] WHEN valid credentials are submitted, THE SYSTEM SHALL start a session valid for 7 days.
- [ ] IF credentials are wrong, THEN THE SYSTEM SHALL show "Email or password is incorrect" without revealing which.
- [ ] IF 10 failed attempts occur for one email from one network origin within 15 minutes, THEN THE SYSTEM SHALL refuse further attempts for the remainder of that window with "Too many attempts, try again later".
- [ ] WHEN the customer signs out, THE SYSTEM SHALL end the session on that device immediately.
- [ ] WHILE no valid session exists, THE SYSTEM SHALL redirect any portal page except sign-in/register/help to sign-in and return to the requested page afterwards.

#### REQ-004 Raise a ticket
- **User Story:** As Priya, I want to describe my problem once, so that I get an answer or a human.
- [ ] WHEN a signed-in customer submits subject (5–120 chars), description (20–5000 chars) and optional category, THE SYSTEM SHALL create a ticket with a unique human-readable number (format `SC-` + digits, sequential) and show its thread within 2 s.
- [ ] THE SYSTEM SHALL record the description as the first customer message of the thread.
- [ ] IF the same submission is received more than once (retry/double tap), THEN THE SYSTEM SHALL create exactly one ticket and return it for each attempt.
- [ ] IF the agent workspace cannot be reached, THEN THE SYSTEM SHALL still create the ticket, show "Queued" on it, and deliver it per BR-SYNC-1.
- [ ] THE SYSTEM SHALL set initial priority Medium and SLA per BR-SLA-1 until AI classification changes it.

#### REQ-006 Home ticket list
- [ ] WHEN Home opens, THE SYSTEM SHALL list the customer's non-resolved tickets newest-activity first with number, subject, status, priority, SLA chip.
- [ ] WHEN the customer switches the filter to Resolved or All, THE SYSTEM SHALL show that set.
- [ ] IF the customer has no tickets, THEN THE SYSTEM SHALL show an empty state with "Raise a ticket" and Help Center search.
- [ ] THE SYSTEM SHALL never show another customer's ticket (REQ-044).

#### REQ-007 Ticket thread
- [ ] THE SYSTEM SHALL show messages oldest-first, each labelled as You / Agent name / AI assistant / System.
- [ ] WHEN a new public message is added from any side, THE SYSTEM SHALL show it without a page refresh (REQ-037).
- [ ] IF a ticket number does not exist or belongs to another customer, THEN THE SYSTEM SHALL show "Ticket not found".

#### REQ-008 Follow-up message
- [ ] WHEN the customer sends a message (1–5000 chars), THE SYSTEM SHALL show it immediately as "Sending", then "Sent" once delivered to the agent workspace.
- [ ] IF delivery fails, THEN THE SYSTEM SHALL keep the message, mark it "Not delivered — Retry", and deliver on retry or per BR-SYNC-1.

#### REQ-009 "This solved it"
- [ ] WHILE the ticket is AI-handling and the latest non-customer message is an AI answer, THE SYSTEM SHALL offer "This solved it".
- [ ] WHEN pressed, THE SYSTEM SHALL resolve the ticket, record resolution type "AI", and prompt for a rating.

#### REQ-010 "Talk to a human"
- [ ] WHILE the ticket is AI-handling, THE SYSTEM SHALL offer "Talk to a human".
- [ ] WHEN pressed, THE SYSTEM SHALL move the ticket to In progress, stop AI replies on it (BR-AI-4), and add an internal note "Customer requested a human" for agents.

#### REQ-011 Close ticket
- [ ] WHILE a ticket is not resolved, THE SYSTEM SHALL offer "Close ticket" behind a confirmation.
- [ ] WHEN confirmed, THE SYSTEM SHALL resolve it in the portal and agent workspace and prompt for a rating.

#### REQ-012 Reopen
- [ ] WHEN a customer sends a message on a resolved ticket, THE SYSTEM SHALL reopen it per BR-ST-2 and show the new status.

#### REQ-013 CSAT
- [ ] WHILE a ticket is resolved and unrated, THE SYSTEM SHALL offer a 1–5 rating with optional comment (≤1000 chars).
- [ ] WHEN submitted, THE SYSTEM SHALL store it, show it on the ticket, and make it visible to agents (REQ-031) within 10 s.
- [ ] IF the ticket is already rated or not resolved, THEN THE SYSTEM SHALL reject with an explanatory message.

#### REQ-015 Status model
- [ ] THE SYSTEM SHALL show exactly one of: AI handling, In progress, Waiting on you, Resolved — mapped per BR-ST-1.

#### REQ-016 AI first response
- [ ] WHEN a ticket is created, or a customer message arrives while AI-handling, THE SYSTEM SHALL produce an AI decision (auto / draft / human per BR-AI-1) within the REQ-041 target.

#### REQ-017 AI classification
- [ ] WHEN the AI decides, THE SYSTEM SHALL record intent, category (from the fixed list in BR-CAT-1), priority, confidence (0–1) and triggers (from BR-AI-2) on the ticket and in the agent workspace.
- [ ] IF classification sets a higher or lower priority than current, THEN THE SYSTEM SHALL apply it and recompute SLA (REQ-027).

#### REQ-018 Grounded answers
- [ ] THE SYSTEM SHALL only let the AI cite help-center articles that were provided to it for that decision.
- [ ] IF an answer cites no valid article, THEN THE SYSTEM SHALL NOT send it to the customer automatically (BR-AI-1).

#### REQ-019 Three-tier decision — per BR-AI-1.
- [ ] Given confidence 0.90, no triggers, ≥1 valid source, priority ≠ Critical → customer receives the AI answer; status stays AI handling.
- [ ] Given confidence 0.72, no triggers → customer receives no AI answer; agents get an internal "AI draft"; status In progress.
- [ ] Given confidence 0.40 → agents get an internal summary; status In progress.

#### REQ-020 Risk triggers — per BR-AI-2/BR-AI-3.
- [ ] IF any trigger is detected, THEN THE SYSTEM SHALL route to human regardless of confidence and raise priority per BR-AI-3.
- [ ] THE SYSTEM SHALL detect triggers by both the AI and a fixed keyword list, using their union.

#### REQ-021 AI fallback
- [ ] IF the AI is unconfigured, times out, is rate-limited after one retry, or returns an unusable result, THEN THE SYSTEM SHALL route to human with summary "AI unavailable — routed to agents".

#### REQ-022 AI badge
- [ ] THE SYSTEM SHALL display AI messages with an "AI assistant" badge and a list of cited articles linking to the Help Center.

#### REQ-023 AI on follow-ups
- [ ] WHILE a ticket is AI-handling, WHEN the customer sends a message, THE SYSTEM SHALL re-run the AI decision with the full thread.
- [ ] IF the AI has already auto-answered twice on the ticket, THEN THE SYSTEM SHALL route the next decision to human (BR-AI-4).
- [ ] WHILE a ticket is In progress or Waiting on you, THE SYSTEM SHALL NOT generate AI replies.

#### REQ-024 SLA targets — per BR-SLA-1.
- [ ] WHEN a ticket is created or its priority changes, THE SYSTEM SHALL set first-response and resolution due times from the ticket's creation time.

#### REQ-025 SLA chip
- [ ] THE SYSTEM SHALL show an SLA chip with state per BR-SLA-2 and a countdown to the next due time that updates at least every 30 s without refresh.
- [ ] THE SYSTEM SHALL convey SLA state by text and icon, not colour alone (REQ-043).

#### REQ-027 SLA recompute — see REQ-024 criterion; triggered by AI or agent priority change.

#### REQ-028 Mirror to agent workspace
- [ ] WHEN a ticket is created, THE SYSTEM SHALL create one agent-workspace conversation carrying the ticket number, the customer's name/email, and the description as the first customer message.
- [ ] THE SYSTEM SHALL create at most one agent-workspace contact per customer.

#### REQ-029 Agent replies
- [ ] WHEN an agent sends a public reply, THE SYSTEM SHALL show it in the customer's thread within REQ-042.
- [ ] THE SYSTEM SHALL never show internal notes to the customer.
- [ ] WHEN the first agent or AI public reply arrives, THE SYSTEM SHALL record first-response time.

#### REQ-030 Agent-side changes
- [ ] WHEN an agent changes status, priority or category label, THE SYSTEM SHALL reflect it on the ticket within REQ-042 and add a timeline entry for status changes.
- [ ] IF change notifications arrive out of order, THEN THE SYSTEM SHALL keep the most recent state.

#### REQ-031 Portal ticket panel
- [ ] WHEN an agent opens a portal conversation, THE SYSTEM SHALL show a "Portal ticket" panel with ticket number, SLA due time (local time + relative), AI tier, AI confidence, CSAT (or "—").

#### REQ-032 AI notes for agents
- [ ] WHEN the tier is draft, THE SYSTEM SHALL add an internal note headed "AI draft" with the answer, confidence and sources.
- [ ] WHEN the tier is human, THE SYSTEM SHALL add an internal note with intent, triggers, a ≤300-char summary and the reason for hand-off.

#### REQ-035 Help Center
- [ ] THE SYSTEM SHALL list categories with article counts, list articles per category, search by keywords, and show an article — without requiring sign-in.
- [ ] IF search returns nothing, THEN THE SYSTEM SHALL offer "Raise a ticket" with the query prefilled as subject.

#### REQ-036 Seeded help content
- [ ] WHEN the environment is first set up, THE SYSTEM SHALL contain ≥10 articles across Account, Billing, Technical, Commerce & Trade, Compliance & GST, Logistics & Orders, including "Payment Pending / Subscription Not Active".

#### REQ-037 Live updates
- [ ] WHILE a customer has the portal open, THE SYSTEM SHALL push new messages and ticket changes for that customer only.
- [ ] IF the live connection drops, THEN THE SYSTEM SHALL reconnect automatically and refresh visible data so nothing is missed.

#### REQ-038 Themes
- [ ] THE SYSTEM SHALL follow the device light/dark preference by default and let the customer override it; the choice persists on the device.

#### REQ-039 Mobile-first
- [ ] THE SYSTEM SHALL be fully usable at 360 px width without horizontal scrolling, with touch targets ≥ 44×44 px.

### Should Have Features

#### REQ-003 Profile
- [ ] WHEN the customer saves a new display name (2–80), THE SYSTEM SHALL update it everywhere in the portal.
- [ ] WHEN the customer submits current and new password (8–128), THE SYSTEM SHALL change it; IF current is wrong, THEN reject with "Current password is incorrect".

#### REQ-005 Deflection suggestion
- [ ] WHEN the customer pauses typing for 800 ms with description ≥ 20 chars, THE SYSTEM SHALL show a possible answer with sources within 3 s, or relevant articles only if no confident answer exists.
- [ ] THE SYSTEM SHALL never block or delay submission because of the suggestion.

#### REQ-014 Status timeline
- [ ] THE SYSTEM SHALL show each status change with time and actor (You / Agent / AI / System).

#### REQ-026 SLA breach flag
- [ ] WHEN a ticket's active SLA due time passes unmet, THE SYSTEM SHALL mark the agent-workspace conversation with a visible "sla-breached" label within 2 minutes.

#### REQ-045 Thread self-heal
- [ ] WHEN a customer opens a ticket, THE SYSTEM SHALL reconcile its messages and status with the agent workspace at most once per 30 s per ticket.

### Could Have Features

#### REQ-033 Branded agent workspace
- [ ] THE SYSTEM SHALL show the product name and logo in the agent workspace title, login page and sidebar.

#### REQ-034 Agent AI assist
- [ ] WHERE agent AI assist is enabled, THE SYSTEM SHALL let agents summarise a conversation and get a suggested reply.

### Won't Have (This Phase)
Agent/admin screens in the portal; file attachments; email/WhatsApp/voice channels; SLA pause while waiting on customer;
help-article authoring in the portal (done in agent workspace or seed); multi-language; social login; password reset by
email; vector/semantic search (unless keyword recall proves poor). Rationale in Out of Scope.

## Non-Functional Requirements

- **REQ-040 Performance:** first meaningful screen ≤ 2.5 s on mid-range phone over 4G (web-vitals LCP "good"); non-AI service responses p95 ≤ 300 ms `[PROPOSED: pending eng confirmation]`.
- **REQ-041 AI latency:** AI decision p95 ≤ 15 s from ticket submit or follow-up `[PROPOSED: pending eng confirmation]`.
- **REQ-042 Propagation:** agent reply or status change visible to an online customer p95 ≤ 5 s `[PROPOSED]`.
- **REQ-043 Accessibility:** WCAG 2.2 AA for all portal pages; all actions keyboard-operable; live thread updates announced politely to screen readers; colour never the sole carrier of meaning; honours reduced-motion preference.
- **REQ-044 Security & privacy:** a customer can only read/act on own tickets; passwords never stored or shown in recoverable form; sessions not readable by page scripts; inbound notifications from the agent workspace and AI assistant are accepted only if provably authentic and fresh (≤ 5 min old); secrets never appear in logs; brute-force limits per REQ-002; AI never receives other customers' data.
- **REQ-046 Reliability / idempotency:** duplicate or replayed notifications never create duplicate messages or state flips; ticket and message creation are retry-safe; no customer message is silently lost when the agent workspace is down (BR-SYNC-1).
- **REQ-047 Scale:** 200 concurrent live customers and 50 tickets/hour on a single deployment `[PROPOSED]`.
- **REQ-048 Operability:** one command starts the whole stack locally; one idempotent setup step configures the agent workspace; health check available.
- **REQ-049 Upgradeability:** agent-workspace customisation limited to branding, one sidebar panel and AI-assist configuration so upstream updates merge cleanly.
- **Compliance:** none regulated beyond general data-protection good practice (personal data = name, email, ticket text). `[Assumption A4]`

## Detailed Feature Specifications

### Feature: AI triage and hand-off (REQ-016…REQ-023, REQ-032)
**Business Rules**
- **BR-AI-1 Tier rule.** Evaluate in order:
  1. AI failure/unavailable → **human** (reason `ai_unavailable`).
  2. Any trigger present (BR-AI-2) → **human**.
  3. Resulting priority Critical → **human**.
  4. Loop guard (BR-AI-4) hit → **human**.
  5. confidence > 0.85 AND ≥1 valid cited source AND non-empty answer → **auto**.
  6. confidence ≥ 0.60 AND non-empty answer → **draft**.
  7. otherwise → **human**.
- **BR-AI-2 Triggers (closed set):** Fraud, Security issue, Legal issue, Angry customer, Payment dispute, Account takeover, Repeated unresolved issue, Critical incident. Detected by the AI and by the reference keyword list; union used.
- **BR-AI-3 Trigger priority floor:** Fraud, Account takeover, Security issue, Critical incident → Critical; any other trigger → at least High. Priority never lowered below the floor by the AI.
- **BR-AI-4 Loop guard & ownership:** AI acts only while status is AI handling; after 2 auto answers on a ticket the next decision is human. "Talk to a human" ends AI involvement until the ticket is resolved and reopened.
- **BR-AI-5 Auto tier effects:** answer posted publicly with sources; status stays AI handling; first response recorded.
- **BR-AI-6 Draft/human effects:** internal note per REQ-032; status In progress; customer sees System message "We've passed this to our support team".

**Edge cases:** AI cites an article it wasn't given → citation dropped; if none remain, auto downgrades to draft. AI output malformed → BR-AI-1 step 1. Two customer messages within seconds → decisions run one at a time per ticket, second uses full thread.

### Feature: Status, SLA, sync
- **BR-ST-1 Status map:** AI handling ⇐ bot-owned/pending; In progress ⇐ open; Waiting on you ⇐ snoozed; Resolved ⇐ resolved.
- **BR-ST-2 Reopen:** a customer message on a resolved ticket reopens it: to AI handling if the AI assistant is active on the inbox (agent workspace behaviour), else In progress.
- **BR-SLA-1 Targets:** table in Engineering Digest; due times = creation time + target; recomputed from creation time on priority change.
- **BR-SLA-2 State:** Resolved → Met if resolved before resolution due and first response before response due, else Breached. Otherwise active due = response due until first public reply, then resolution due; past due → Breached; ≤ 25 % of window left → At risk; else On track.
- **BR-SYNC-1 Deferred delivery:** tickets/messages not yet delivered are retried every 30 s, up to 20 attempts (~10 min) then shown "Delayed" while retries continue every 5 min.
- **BR-CAT-1 Categories:** Account, Billing, Technical, Commerce & Trade, Compliance & GST, Logistics & Orders, General.

## Edge Cases
- [ ] Agent replies while customer offline → appears on next open (REQ-045).
- [ ] Agent resolves while customer is mid-typing → message reopens per BR-ST-2.
- [ ] Customer presses "This solved it" while an agent simultaneously opens the ticket → last state wins; timeline shows both.
- [ ] Priority lowered by agent below trigger floor → agent decision wins (floor applies to AI only).
- [ ] Customer has two tabs open → both update live; sign-out in one ends the session for both on next request.
- [ ] Clock skew between systems → freshness window 5 min; SLA computed from portal clock only.

---

## MVP Scope
All Must-Have features: REQ-001, 002, 004, 006–013, 015–025, 027–032, 035–039, plus NFRs REQ-040–044, 046–049.

## Future Scope
Phase 1.1 (Should): REQ-003, 005, 014, 026, 045. Phase 1.2 (Could): REQ-033, 034.

## Out of Scope
Portal agent/admin screens (agent workspace owns them); attachments (storage + scanning cost); extra channels; SLA pause
(needs business-hours policy); portal KB authoring (agent workspace/seed suffices); i18n; social login; email password
reset (no email delivery in scope); semantic search (keyword first per PLAN).

## Estimation Blockers

| # | What can't be sized yet | Why | Owner | Needed by |
|---|---|---|---|---|
| 1 | None blocking. Known cost: agent workspace built from source needs ~4 GB RAM and 10–15 min first build | Fork built locally | Product owner | Before Stage 8a |

---

## Success Metrics

- **Adoption:** ≥ 70 % of pilot customers raise tickets via portal in first month `[PROPOSED]`.
- **Engagement:** ≥ 30 % of composed tickets abandoned after viewing a suggestion (deflection) `[PROPOSED]`.
- **Quality:** auto-tier answers accepted ("This solved it") ≥ 50 %; CSAT ≥ 4.2 avg; zero auto replies on triggered tickets.
- **Business:** SLA first-response Met ≥ 90 %.

| Metric | Event | Properties | Purpose |
|---|---|---|---|
| Adoption | `ticket_created` | ticketNumber, category, createdBy | portal usage |
| Deflection | `suggestion_shown`, `compose_abandoned_after_suggestion` | confidence, sourceCount | deflection rate |
| Auto acceptance | `ai_decision` (tier), `ai_answer_accepted` | tier, confidence, triggers | quality of auto tier |
| Zero risky autos | `ai_decision` | tier, triggers | guardrail check |
| CSAT | `csat_submitted` | rating, resolutionType | satisfaction |
| SLA Met | `ticket_resolved` | slaState, priority | SLA performance |

Events are structured log lines in this phase (no analytics product).

## Timeline & Roadmap

| Phase | Milestone | Timing | Scope |
|---|---|---|---|
| 1 | Demo (PLAN §9) | after Stage 10 | MVP Scope |
| 1.1 | Polish | after demo | Future Scope Should |
| 1.2 | Workspace polish | later | Could |

## Risks & Constraints

### Constraints (fixed by PLAN.md)
- Agent workspace = forked open-source agent workspace (Chatwoot), integrated only via its public API, webhooks and bot hook; fork edits limited per REQ-049.
- AI = hosted OpenAI-compatible model (Groq); one key shared with agent AI assist.
- Customer portal is new; reference prototype is ideas-only.

### Assumptions
- A1 Problem evidence is the prototype's seed data and owner judgement, not user research.
- A2 One support account / one company (single tenant).
- A3 Customers are signed-in users; no guest tickets.
- A4 No regulated data (no card numbers/health data) is expected in tickets; AI receives ticket text.

### Risks
| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| AI rate limits during spikes | Med | Med | one retry then human (REQ-021) |
| AI gives wrong confident answer | High | Low | grounding + sources + triggers + "Talk to a human" |
| Agent workspace memory/build | Med | High | documented requirement; one-time build |
| Missed notifications when portal down | Med | Low | REQ-045 reconcile |
| Prompt injection via ticket text | Med | Med | tier rule & citations enforced outside the AI |

## Open Questions
- [ ] (non-blocking) Confirm proposed numbers marked `[PROPOSED]` — defaults apply if unanswered.

---

## Supporting Research

### Domain Invariants (gate run)
| # | Invariant (15-yr support practitioner) | Resolution |
|---|---|---|
| 1 | Customer always reachable to a human | REQ-010, REQ-020, REQ-021 |
| 2 | SLA targets by priority, visible and tracked | REQ-024–027 |
| 3 | Internal notes never leak to customers | REQ-029 |
| 4 | Ticket identity stable and human-readable | REQ-004 |
| 5 | CSAT after resolution | REQ-013 |
| 6 | Reopen on customer reply | REQ-012 |
| 7 | Data isolation between customers | REQ-044 |
| 8 | Business hours / SLA pause | Out of Scope (needs policy) |
| 9 | Audit trail of status changes | REQ-014 (Should) — agent workspace keeps its own audit |

### Competitive Analysis
Mainstream help desks show AI answers with citations and a one-tap human escape; this PRD matches that baseline.

### User Research
None beyond prototype seed data (A1).

### Market Data
Not applicable for an internal pilot.

### Glossary
- **Agent workspace:** tool agents/admins use to answer conversations.
- **Tier:** AI decision outcome — auto (answer customer), draft (internal suggestion), human (hand-off).
- **Trigger:** risk signal forcing human handling (BR-AI-2).
- **SLA:** promised first-response and resolution times.
- **CSAT:** customer satisfaction score 1–5.
- **Deflection:** customer finds answer before raising a ticket.
