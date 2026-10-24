# SmartCC v4: Five companies, real knowledge, customer records and AI lookups

## Decisions (user, 2026-10-23)

- **Content:** each company gets help articles researched from public web sources, plus **mock** customer records that the AI can look up.
- **Company names:** real company names, chosen by the user. All customer records are fabricated, every seeded record carries `mock: true`, and the portal shows a "Demo data" ribbon. This setup is for **local demos only**. It must not be published or deployed with real brand names without permission.
- **Portal routing:** each company has its own portal URL, `/c/<slug>`, with its own branding, KB, Chatwoot inbox and team.

| # | Sector | Company | slug | Public sources to research |
|---|---|---|---|---|
| 1 | Bank | State Bank of India | `sbi` | sbi.co.in FAQs, RBI customer-service and complaint rules (Integrated Ombudsman), UPI/NEFT/IMPS limits, card blocking, KYC |
| 2 | Factory | Tata Steel (Jamshedpur Works) | `tatasteel` | tatasteel.com customer/dealer pages, product grades, order and dispatch process, quality and test certificates, vendor onboarding and payment terms, plant visits and safety rules |
| 3 | Airport | Delhi Airport (DEL, Indira Gandhi International) | `delhiairport` | newdelhiairport.in FAQs, DGCA passenger charter (refunds, delays, denied boarding), baggage rules, lost and found, parking, DigiYatra, terminal guide |
| 4 | Government documents website | Passport Seva (MEA) | `passportseva` | passportindia.gov.in FAQs: fresh and reissue, Tatkal, documents, appointments (PSK/POPSK), police verification, fees, tracking by file number |
| 5 | Corporate office | Infosys (Bengaluru campus) | `infosys` | public Infosys pages: vendor/supplier portal FAQs, visitor policy, campus facilities, investor and shareholder services, careers/background-verification FAQs. Employee data is mock only. |

## Data contract

Seed data goes in `api/seed/companies/<slug>/`. Research agents write only these files.

```
company.json   { slug, name, sector, tagline, primaryColor, accentColor, logoText,
                 supportHours, slaOverride?: {critical,high,medium,low} (minutes, first response),
                 categories: [ {key, label, labelHi} ],          // 5–8 company-specific topics
                 sources: [ {title, url, accessedAt} ] }          // every page used
kb.en.json     [ { slug, category, title, body, keywords:[] } ]  // 15–20 articles, 120–400 words each, plain text,
                                                                 // facts paraphrased from the sources (no copied paragraphs),
                                                                 // numbers/limits/fees as published, "as of <month year>" where it changes
kb.hi.json     [ { slug, title, body } ]                         // natural Hindi for every article
records.json   { customers: [ {key, name, email, phone, password:"Demo@1234"} ],   // 4–6 demo customers
                 collections: { <name>: [ {...record, customerKey, mock:true} ] } } // company-specific, see below
tools.json     [ { name, description, parameters (JSON Schema), collection, match: {field: "$arg"},
                   scope: "owner" | "public", verify?: [fields the user must also supply] } ]
queries.json   [ { q, lang, expect: {tool?, articleSlug?, answerContains?:[]} } ]  // 15 realistic customer queries, en+hi, for eval
```

Suggested collections and lookup tools (owner scope means only the signed-in customer's own records are visible):

| Company | Collections | Tools |
|---|---|---|
| sbi | accounts, cards, transactions, loans, complaints | `get_account_summary`, `get_recent_transactions(accountLast4, days)`, `get_card_status(last4)`, `get_loan_details(loanNo)`, `get_complaint_status(ref)` |
| tatasteel | dealer_orders, dispatches, invoices, quality_certificates, vendor_payments | `get_order_status(orderNo)`, `track_dispatch(lrNo)`, `get_invoice(invoiceNo)`, `get_test_certificate(heatNo)`, `get_vendor_payment(invoiceNo)` |
| delhiairport | flights (public), bookings, baggage_claims, lost_found, parking | `get_flight_status(flightNo, date)` (public), `get_baggage_claim(pirRef)`, `search_lost_found(item, date)`, `get_parking_booking(ref)` |
| passportseva | applications, appointments, police_verification | `get_application_status(fileNo, dob)` (verify dob), `get_appointment(arn)`, `get_police_verification(fileNo)` |
| infosys | employees, payslips, leave, vendor_invoices, visitor_passes | `get_payslip(month)`, `get_leave_balance()`, `get_vendor_invoice_status(invoiceNo)`, `get_visitor_pass(passNo)` |

## Engine changes

**Tenancy**
- A `Company` model is added.
- `companyId` is added on User, Ticket, KbArticle, KbTranslation, KbChunk, Notification and Feedback.
- Users are unique per (company, email).
- Existing data becomes company `smartcc`, the default.

**Portal**
- Routes live under `/c/:slug/...`, and `/` becomes a company picker.
- Branding comes from `company.json`, applied as CSS token overrides. A "Demo data" ribbon is shown.
- Ticket topics come from each company's categories.

**Retrieval**
- KB retrieval and vectors are scoped by company.
- Each company has its own eval run, using `queries.json` together with the existing gate.

**AI lookups**
- The bot and assistant call Groq with function calling, using that company's `tools.json`.
- The server executes each tool against `MockRecord {companyId, collection, customerId?, data}`:
  - Owner scope filters on the signed-in customer; verify fields must match too.
  - Results are redacted, so card and account numbers show only the last 4 digits.
- There are at most 3 tool calls per turn. Every call is logged.
- Answers cite tool results. If the AI answered from a tool result, the reply is marked "Checked your records".

**Chatwoot**
- The setup script creates one API inbox and one team per company, attaches the bot, and adds labels named after each company's categories.
- The Portal ticket panel shows the company name.
- SmartCC Analytics gets a company filter.

**Mock data**
- `npm run seed:companies` is idempotent.
- It creates the companies, demo customers, records, KB (en and hi) and embeddings.

## Phases

1. **Research and data** (5 parallel agents): web research, then the data files per company. A source list is mandatory.
2. **Engine** (in parallel with phase 1, built against this contract): tenancy, portal routing and branding, the tool-calling layer, seed loader, Chatwoot setup, analytics filter.
3. **Integrate and QA:**
   - load all 5 companies;
   - run each company's `queries.json` against real Groq and report accuracy and tool-call correctness;
   - e2e: one flow per company;
   - check owner-scope security (customer A cannot read customer B's records; Passport Seva lookups require the date of birth).

## Done when

- All 5 portals load at `/c/<slug>` with their own branding and KB in English and Hindi.
- The demo customers can ask real-world questions, and the AI answers either from that company's KB or from a record lookup.
- Query eval accuracy is ≥ 85 % per company, measured against real Groq.
- The security tests pass.
- All suites are green, and the work is committed as `v4.0.0`.
