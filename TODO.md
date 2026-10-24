# SmartCC — TODO

## Abhi ka haal
- [x] v1–v3 done and committed (`v3.0.0`).
- [x] v4: 5 companies (SBI, Tata Steel, Delhi Airport, Passport Seva, Infosys) are connected: data, AI lookups, one Chatwoot inbox per company.
- [x] Commit v4 (`v4.0.0`).

## Voice agent (bolne wala AI)
- [x] Mic button in the assistant and in ticket chat. The customer speaks and the speech becomes text through Groq Whisper (`whisper-large-v3-turbo`), Hindi and English.
- [x] The AI's answer is read aloud by the browser's voice (speechSynthesis), with a Hindi voice when available.
- [x] Hands-free mode: after the reply it listens again automatically. Stop button.
- [x] api: `POST /api/voice/transcribe` with an audio upload (max 30 s), rate limited, and a tested error path.
- [x] Hindi and English strings, accessible (keyboard, aria-live).
- [ ] Later (optional): phone call agent with Twilio or Exotel (needs a number).

## Bache hue fixes
- [x] Correct the 3 wrong `articleSlug` values in SBI `queries.json`, then re-run the eval (100% achieved, 15/15).
- [x] Tata Steel: the Hindi vendor-payment question should choose the tool (prompt fix, 100% achieved, 15/15).
- [x] Fix the e2e suite: all 8 Playwright test suites green and stable (`/c/<slug>` URLs, picker, ribbon).
- [x] Docs: `lld-backend.md` §14 (multi-company, tools, voice agent), `test-report-v4.md`.
- [x] Streaming plus tools documented (lookup round executes first, then answer streams with synthesized records).
- [ ] Allow sign-in to more than one company at once (optional).

## Credentials needed (from the user)
- [ ] WhatsApp: `WHATSAPP_PHONE_NUMBER`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_API_KEY` in `.env`, plus a public URL (ngrok).
- [ ] SMS OTP: `SMS_PROVIDER` and the provider's keys (`MSG91_AUTH_KEY` / `TWILIO_ACCOUNT_SID`).

## Later
- [ ] Production deploy (Caddy HTTPS, Chatwoot production mode), Lighthouse, k6 load test.
- [ ] Hindi review by a native speaker.
- [ ] Email channel, website widget, ticket merge, status page, KB authoring for agents, auto-routing, AI actions.
