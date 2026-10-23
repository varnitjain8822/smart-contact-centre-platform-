# Browser Report — Stage 10 (QA)

Tooling: `@playwright/test` ^1.49 (Chromium headless shell) and `@axe-core/playwright` ^4.10. Config is in `e2e/playwright.config.ts`:
- `baseURL` = `http://localhost:${WEB_PORT}` (read from the root `.env`; overridable with `BASE_URL`);
- 1 worker, 90 s test timeout, trace kept on failure.

Harness (T51):
- `e2e/groq-stub.mjs`: an OpenAI-compatible `POST /v1/chat/completions` built on Node `http` with no dependencies. It returns the LLD AiOutput JSON:

  | Customer text contains | Tier | confidence | priority | Cites |
  |---|---|---|---|---|
  | "refund" | draft | 0.7 | — | refund-status |
  | "payment" | auto | 0.95 | high | payment-pending-subscription-not-active |
  | anything else | human | 0.3 | — | — (empty answer) |

  It only cites slugs that are present in the prompt's ARTICLES block.
- `docker-compose.e2e.yml` adds the `groq-stub` service and sets api `GROQ_URL=http://groq-stub:8080/v1` and `GROQ_API_KEY=e2e-stub`. With it, `healthz` reports `"groq":"configured"`.

## Results (final run)
| Spec | Viewport(s) | Result | Notes |
|---|---|---|---|
| demo.spec.ts | 1280×720 | ✓ | The AI answer and the "Based on 1 article" disclosure both show, and the disclosure links to "Payment Pending / Subscription Not Active". CSAT 5 then syncs to Chatwoot `csat` (polled). |
| handoff.spec.ts | 1280×720 | ✓ | The agent reply is visible in under 5 s via SSE, with the 5 s budget asserted explicitly. The agent resolves in Chatwoot and the portal pill shows Resolved. |
| a11y.spec.ts | 1280×900 and 360×780, light and dark | ✓ | 36 axe scans, 0 serious/critical. No horizontal overflow at either width. |

## Issues found in the browser (all fixed — details in test-report.md §6)
- `/tickets/:n`: axe `listitem` (serious). The `role="log"` on the `<ol>` orphaned the `<li>` items.
- Every signed-in page at 360 px: axe `label-content-name-mismatch` (serious). The bottom tab's visible text "Home" did not match its accessible name "My tickets".

Neither issue reproduces after the fixes. Artifacts from failed runs (traces) live in `e2e/test-results/`, which is git-ignored.
