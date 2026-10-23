# LLD Consistency Pass (Stage 5c) — API contract: lld-frontend.md §8/§11 vs lld-backend.md §4

Method: every endpoint, DTO field, enum, header, status code and SSE event the frontend consumes was compared
line-by-line with the backend contract. Backend §4 is the source of truth; discrepancies were fixed in the side that
was wrong (noted per row). Result: **CONSISTENT after 5 fixes**.

## 1. Endpoint matrix

| BE | Method/path | FE fn | Request shape | Response shape | Status codes FE handles | Result |
|---|---|---|---|---|---|---|
| E1 | POST /api/auth/register | register | `{name,email,password}` = | `{user:User}` = | 201, 400, 409 EMAIL_TAKEN, 429 | ✅ (note 1) |
| E2 | POST /api/auth/login | login | `{email,password}` = | `{user}` = | 200, 400, 401 INVALID_CREDENTIALS, 429 | ✅ |
| E3 | POST /api/auth/logout | logout | `{}` (JSON, passes 415 guard) | 204 | 204 | ✅ |
| E4 | GET /api/auth/me | me | — | `{user}` | 200, 401 | ✅ (fix A) |
| E5 | PATCH /api/me | updateName | `{name}` | `{user}` | 200, 400 | ✅ |
| E6 | POST /api/me/password | changePassword | `{currentPassword,newPassword}` | 204 (+cookie) | 204, 400 WRONG_PASSWORD | ✅ |
| E7 | GET /api/tickets?scope&limit&before | listTickets | query = | `{items:TicketSummary[], nextCursor}` = `Page<T>` | 200 | ✅ |
| E8 | POST /api/tickets + Idempotency-Key | createTicket | `{subject,description,category\|null}` = | `{ticket:TicketDetail, messages:Message[]}`; 201 new / 200 replay | 200/201 both `res.ok` | ✅ |
| E9 | GET /api/tickets/:number | getTicket | — | `{ticket}` | 200, 404 | ✅ (fix B) |
| E10 | GET /api/tickets/:number/messages | getMessages | — | `{items:Message[]}` | 200, 404 | ✅ (fix C) |
| E11 | POST /api/tickets/:number/messages | sendMessage | `{body,clientMessageId}` = | `{message}`; 201 / 200 replay | 200/201, 4xx/5xx → failed bubble | ✅ |
| E12–E14 | POST …/accept, /handoff, /resolve | accept/handoff/resolve | `{}` | `{ticket}` | 200, 409 INVALID_STATE | ✅ |
| E15 | POST …/csat | rate | `{rating:int 1–5, comment ≤1000}` = | `{ticket}` | 200, 409 INVALID_STATE / ALREADY_RATED | ✅ |
| E16 | GET /api/kb/articles?q&category | kbList | query = | `{items:KbArticleSummary[]}` = | 200 | ✅ |
| E17 | GET /api/kb/articles/:slug | kbArticle | — | `{article:KbArticle}` = | 200, 404 | ✅ |
| E18 | POST /api/ai/suggest | suggest | `{subject,description}` = | `{answer,confidence,sources,articles}` = `Suggestion` | 200, 429/any → hidden | ✅ |
| E19 | GET /api/stream | useLiveEvents | cookie | `message.created {ticketNumber,message}`, `ticket.updated {ticket}`, ping, `retry: 3000` | reconnect | ✅ |
| E20–E22 | webhooks, healthz | — | not consumed by FE | — | — | n/a |

## 2. DTO field check
| Type | BE §4.2 | FE §8 | Result |
|---|---|---|---|
| User | id,name,email,createdAt | same | ✅ |
| Sla | responseDueAt,resolutionDueAt,firstResponseAt,resolvedAt,activeDueAt,state(4) | same | ✅ |
| TicketSummary | number,subject,status,priority,category,createdAt,updatedAt,lastMessageAt,sla,aiTier,delivery | same | ✅ |
| TicketDetail | + description,customerCategory,resolutionType,csat,statusHistory,ai{confidence,triggers},actions{4} | same | ✅ |
| Message | id,ticketNumber,author(4),authorName,body,sources,createdAt,clientMessageId,deliveryState | same (+ client-only `localState` on `UiMessage`) | ✅ |
| KbArticleSummary / KbArticle | slug,title,category,excerpt,updatedAt (+body) | same | ✅ |
| Enums Status/Priority/Category/Trigger/SlaState | constants.js | identical literal sets | ✅ |
| Error envelope & codes | §4.5 (14 codes) | `ErrorCode` lists the 12 customer-facing codes; webhook-only `INVALID_SIGNATURE`, `STALE_WEBHOOK` intentionally absent | ✅ |

## 3. Discrepancies found and fixed

| # | Finding | Side fixed | Change |
|---|---|---|---|
| A | FE global 401 handler would redirect signed-out visitors away from public Help pages, because `RequireAuth`/shell call `me` and get 401 | FE | 401 redirect excludes the `['me']` query (lld-frontend §15) |
| B | FE live handler wrote `{ticket}` to `['ticket',n]` while `useTicket` returned `TicketDetail` directly — cache shape mismatch | FE | cache stores raw `{ticket}`; `useTicket` uses `select` (§10) |
| C | `upsertMessage` expects an array but E10 returns `{items}` | FE | `useMessages` queryFn returns `r.items` (§10) |
| D | BE sends `Retry-After` on 429; FE `ApiError` dropped headers, so toast could not show wait time | FE | `ApiError.retryAfterS` (§11) |
| E | BE `message.created` can repeat for the same id (webhook insert, then bot enrichment with sources); FE initially appended | FE | `upsertMessage` replaces by id/clientMessageId (§12) — BE §4.6 documents the repeat |

Notes: (1) `EMAIL_TAKEN` has no `details[]`; FE maps by code to the email field. (2) Origin guard: the Vite proxy must not rewrite the `Origin` header (`changeOrigin` only rewrites `Host`); browser Origin `http://localhost:5173` must equal `WEB_ORIGIN`. (3) All FE mutations send a JSON body, satisfying the BE 415 guard.

## 4. Verdict
Contracts agree after fixes A–E. No backend contract change was required.
