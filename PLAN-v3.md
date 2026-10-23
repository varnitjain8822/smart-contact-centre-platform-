# SmartCC v3: Channels, OTP, Copilot, Analytics, Vector search

Base is `v2.0.0` (commit 6c12ed5). Everything runs locally on the dev profile; there is no deploy.

## Decisions (from the user, 2026-10-23)

| Topic | Choice |
|---|---|
| WhatsApp | Meta WhatsApp Cloud API through Chatwoot's native WhatsApp inbox. The code is complete and tested against a mock. It goes live once the user supplies the phone number ID and access token. |
| OTP login | Email OTP now; mailhog receives it locally. An SMS provider interface for MSG91 and Twilio is built but switched off by env until keys exist. |
| Analytics | A new "SmartCC Analytics" page inside Chatwoot Reports, in the fork. Admins open it with their Chatwoot login. |
| Copilot | Chatwoot Captain Tasks (MIT): summarize, reply suggestion, rewrite and follow-up. They run on Groq `openai/gpt-oss-120b` through `CAPTAIN_OPEN_AI_ENDPOINT`. |
| Vector search | A local multilingual embedding model in the api (`Xenova/multilingual-e5-small` via `@huggingface/transformers`). It needs no external key and handles Hindi. Hybrid ranking combines the text score with cosine similarity. Vectors are stored in Mongo and compared in memory, which is fine at the current KB size. |

## Features

### 1. WhatsApp channel
**Setup:** `scripts/chatwoot-setup.mjs` gets an optional WhatsApp step. It creates a Cloud inbox from `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID` and `WHATSAPP_API_KEY` in `.env`, attaches the SmartCC Agent Bot and adds the agents to it.

**Ticket handling:**
- **Incoming message:** the first WhatsApp message in a conversation creates a portal ticket with `channel: 'whatsapp'`.
- **Customer link:** the ticket goes to the user with the matching `User.phone`; otherwise a phone-only customer record is created.
- **AI reply:** the bot answers with the same 3-tier logic. Replies go back over WhatsApp; markdown is stripped and messages stay within the length limit.
- **Portal view:** linked users see these tickets in the portal with a WhatsApp badge.

**Tests:** a mock of the Meta Graph API for outbound messages, plus a simulated inbound webhook into Chatwoot.

### 2. OTP login (email now, SMS ready)
**Endpoints:**
- `POST /api/auth/otp/request {email|phone}` sends a 6-digit code. Codes expire after 10 minutes, allow at most 5 tries, are stored as a hash, and requests are rate limited.
- `POST /api/auth/otp/verify` signs the user in with the same session and remember-me behaviour as password login.

**Email:** OTP emails use English and Hindi templates and go through mailhog locally.

**SMS:** an SMS adapter with `SMS_PROVIDER=msg91|twilio`. When it is not configured, the phone option is hidden.

**Web:** the login page offers "Sign in with code" (enter the code, resend timer, autofill with `autocomplete="one-time-code"`). Signing up with a code can also create the account.

### 3. Agent AI copilot (Chatwoot)
- The bootstrap script sets the Captain config to the Groq endpoint, model and key (only one key is allowed here).
- Verified in the Chatwoot UI: reply suggestion, summarize, rewrite (tone) and the label/priority suggestions all return Groq output.
- The "Portal ticket" panel gains an "AI summary" line that shows `ai.summary` from the portal.

### 4. Analytics (Chatwoot Reports → SmartCC Analytics)
**API:** `GET /api/admin/analytics?from&to` is authenticated with the Chatwoot user's access token. The portal api verifies it against Chatwoot `/api/v1/profile` and requires the administrator role. It returns:
- tickets per day;
- AI tier mix (auto/draft/human) and the deflection rate (resolved by AI ÷ total);
- escalation triggers;
- SLA first-response and resolution compliance and breaches;
- CSAT average and distribution, split between AI and human;
- median first response and resolution time;
- top categories and intents;
- KB gaps (questions where AI confidence was low);
- assistant feedback 👍/👎.

**Fork:** a new route under Reports with KPI tiles and charts, built with the existing Chatwoot chart components and date-range filter. i18n keys are in `en`.

### 5. Vector search (KB + bot + assistant)
- Each KB article and Hindi translation is chunked and embedded once, re-embedding when the content hash changes. Vectors are stored in Mongo.
- Retrieval uses hybrid ranking: BM25-style text score plus cosine similarity, merged. It is used by the bot, `/suggest`, the assistant and Help search.
- **Eval set:** `api/test/eval/kb-retrieval.json` holds about 40 English and Hindi questions mapped to their expected article. The test asserts top-3 recall ≥ 90 % and must beat text-only retrieval.

## Not in v3 (remaining B–D ideas)
Email channel, website widget, voice input, ticket merge and follow-up reminders, public status page, KB authoring for agents, auto-routing by skill, AI actions (refund lookup and similar). Each can be picked up next.

## Done when
- All suites are green (api, web, Chatwoot panel and analytics specs, e2e).
- An email OTP login works end to end in mailhog.
- The copilot buttons in Chatwoot return Groq text.
- The analytics page shows real numbers from the stack.
- Vector retrieval passes the eval gate.
- The WhatsApp flow passes against the mock.
- Everything is committed as `v3.0.0`.
