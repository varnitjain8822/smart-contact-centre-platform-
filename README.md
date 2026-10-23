# SmartCC — Smart Contact Center v3

Customer support portal (`web/`, `api/`) backed by a Chatwoot fork (`chatwoot/`, branch `smartcc`) as the agent workspace,
with a Groq-powered AI bot answering first. Design docs: `.ai/artifacts/`.

| Path | What |
|---|---|
| `api/` | portal-api: Express + MongoDB, webhooks, AI bot, SSE, sync worker |
| `web/` | portal-web: React SPA (Vite) |
| `chatwoot/` | Chatwoot fork (separate git repo, ignored here) |
| `e2e/` | Playwright specs + Groq stub (`groq-stub.mjs`) |
| `scripts/init-env.mjs` | creates `.env` and `chatwoot/.env` with generated secrets (idempotent) |
| `scripts/chatwoot-setup.mjs` | creates account, users, inbox (+ agent membership), agent bot, attributes, labels; writes `CHATWOOT_*` into `.env` |
| `docker-compose.yml` | includes `chatwoot/docker-compose.yaml` (+ `docker/chatwoot.override.yml`); profiles `dev` / `prod` |
| `docker-compose.e2e.yml` | e2e overlay: adds `groq-stub`, points api `GROQ_URL` at it, mailhog in both profiles |
| `docker/` | Caddyfile, mongo user init, Chatwoot production Dockerfile mirror + its `.dockerignore` (excludes `chatwoot/core`) |
| `Makefile` | `make up` (dev) · `make prod` · `make down` · `make backup` · `make restore` · `make e2e` · `make logs` |
| `scripts/backup.sh`, `scripts/restore.sh` | mongodump + pg_dump + uploads/storage tar → `backups/<UTC timestamp>/`, and back |

## Runbook

Needs Docker with **≥ 4 GB RAM** for Chatwoot (8 GB for the production image build), Node ≥ 22 on the host.
First Chatwoot build takes 10–15 min. Two compose profiles, **one at a time** (they share the `api`/`rails` network names):

| | `dev` (`make up`, default `COMPOSE_PROFILES` in `.env`) | `prod` (`make prod`) |
|---|---|---|
| Chatwoot | rails dev server + vite + mailhog, `http://localhost:$CW_PORT` | `RAILS_ENV=production` image (assets precompiled), sidekiq, `https://agent.smartcc.localhost` |
| Portal | vite preview `http://localhost:$WEB_PORT` | Caddy static build `https://smartcc.localhost` (`/api` → api, SSE unbuffered) |
| api | `127.0.0.1:4000`, email → mailhog | not published; email → `SMTP_URL` (empty = off) |
| Published ports | `CW_PORT`, `WEB_PORT`, 4000 (local), 3036, 1025, 8025 | only Caddy: `127.0.0.1:443` + `:80` (`HTTPS_PORT`/`HTTP_PORT`) |

Both profiles use the same postgres database (`chatwoot_dev`), mongo and uploads, so setup done in one carries over.

First run (dev):

```sh
node scripts/init-env.mjs                     # .env + chatwoot/.env with generated secrets (idempotent; never commit .env)
#   add GROQ_API_KEY to .env for AI; without it every ticket goes to a human
docker compose build base                     # Chatwoot base image (rails/vite images build FROM it)
make up                                       # dev profile; creates the mongo root + app users
docker compose run --rm rails bundle exec rails db:chatwoot_prepare
node scripts/chatwoot-setup.mjs               # prints token fingerprints only
docker compose up -d --force-recreate api     # api reads the new CHATWOOT_* values
curl -s http://localhost:4000/healthz         # {"ok":true,"mongo":"up","chatwoot":"up","groq":"configured"}
```

Portal: http://localhost:5173 · Agent workspace: http://localhost:3000 (credentials `CW_AGENT_*` in `.env`).

### Prod profile (local HTTPS)

```sh
make prod                                     # stops dev services, builds api + Caddy/web, runs db:chatwoot_prepare, starts prod
curl -k https://smartcc.localhost/api/healthz
```

- Portal https://smartcc.localhost · Agent workspace https://agent.smartcc.localhost. `*.localhost` resolves to 127.0.0.1 in browsers and curl.
- Certificates come from Caddy's internal CA. Trust it once (macOS):
  `docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt /tmp/caddy-root.crt && sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /tmp/caddy-root.crt`
- After Chatwoot fork changes: `docker compose --profile prod build rails-prod` (the first `make prod` builds it). `make prod` refreshes
  `docker/chatwoot.Dockerfile` from `chatwoot/docker/Dockerfile`; the mirror exists so `docker/chatwoot.Dockerfile.dockerignore`
  can keep `chatwoot/core` out of the build context without touching the fork.
- Email: api uses `SMTP_URL` / `MAIL_FROM` from `.env`; Chatwoot's own mail uses `SMTP_*` in `chatwoot/.env`.
- Back to dev: `make up`. Stop everything: `make down` (volumes are kept).

### Mongo auth

`mongo` runs with auth: root (`MONGO_ROOT_PASSWORD`) for admin/backups, and the app user `smartcc_app` (`readWrite` + `dbAdmin` on `smartcc` only,
`MONGO_APP_PASSWORD`), which compose puts into the api `MONGO_URL`. Users are created by `docker/mongo-init.js` on a fresh volume
and refreshed by `make up` / `make prod` (`make mongo-users`), which also migrates a volume created before auth existed.

### Backups

```sh
make backup                                   # → backups/<UTC timestamp>/ (mode 700): mongo.archive.gz, chatwoot.pgdump, uploads.tar.gz, chatwoot-storage.tar.gz
make restore                                  # latest backup; or make restore DIR=backups/20261023T055910Z
```

Restore is destructive for the `smartcc` mongo db and the Chatwoot database; it stops api/rails/sidekiq while restoring and starts them again.
Upload/storage files are extracted over the current ones (newer files are not deleted).

### Operations

All services have healthchecks (`docker compose ps`), `restart: unless-stopped` and json-file log rotation (10 MB × 3).
`make logs` (or `make logs S="api rails-prod"`).

### Port overrides (another app already on 3000 / 5173)

| Where | Variable | Effect |
|---|---|---|
| `.env` | `CW_PORT=3310` | Chatwoot published on `127.0.0.1:3310` |
| `.env` | `WEB_PORT=5273` | portal published on `:5273`; api `WEB_ORIGIN` follows it (compose) |
| `chatwoot/.env` | `FRONTEND_URL=http://localhost:3310` | links/assets in the agent workspace use the new port |
| shell, setup only | `CHATWOOT_PUBLIC_URL=http://localhost:3310 node scripts/chatwoot-setup.mjs` | setup script talks to Chatwoot on the new port |

Then open `http://localhost:$WEB_PORT` and `http://localhost:$CW_PORT`. After changing `FRONTEND_URL`, `docker compose up -d --force-recreate rails sidekiq`.

### Demo (definition of done)

1. Portal → **Create account** → **New ticket** "Payment deducted but plan inactive" → the AI answers from the help center with a source (or drafts and hands off).
2. Auto answer: **This solved it** → Resolved → rate 5 stars.
3. Hand-off (e.g. a refund question → AI draft): ticket shows **In progress**. Sign in to Chatwoot as `CW_AGENT_EMAIL`, open the conversation (Portal ticket panel shows number, SLA, AI tier/confidence; private AI note), reply.
4. The reply appears in the portal thread live (≤ 5 s, no reload). Agent resolves → portal shows **Resolved** → customer leaves CSAT (shown back in the panel).

## Tests

```sh
cd api && npm ci && npx vitest run            # mongodb-memory-server; Chatwoot and Groq faked
cd web && npm ci && npx vitest run
```

E2E against the running stack with the deterministic Groq stub ("refund" → draft tier, "payment" → auto tier, else human):

```sh
cd e2e && npm ci && npx playwright install chromium && cd ..
make e2e                                      # dev stack + groq-stub overlay, then playwright
```

`make up` / `make prod` never include the stub (`--remove-orphans` drops it).
`make e2e` also recreates Chatwoot **sidekiq** with `WHATSAPP_CLOUD_BASE_URL=http://groq-stub:8080` (the stub doubles as a WhatsApp Graph API mock).
Back to normal afterwards: `COMPOSE_PROFILES=dev docker compose up -d --force-recreate api sidekiq && docker rm -f smartcc-groq-stub-1`.

KB retrieval eval (real embedding model, downloaded once): `cd api && npm run eval` (prints text-only vs hybrid top-3 recall).

Playwright reads `WEB_PORT`, `CW_PORT`, `CW_AGENT_*`, `CHATWOOT_*` from the root `.env`. Each run registers 2–3 customers and
registration is limited to 5/h per IP (in-memory): recreate `api` before re-running. To return to real Groq:
`docker compose up -d --force-recreate api` (without the e2e file).

### v3 options

- **Vector search**: the api embeds help articles with `Xenova/multilingual-e5-small` on first start (~130 MB download into the `models` volume); until then search is text-only. `EMBED_MODEL=off` disables it.
- **Sign-in codes**: email codes work out of the box (mailhog in dev). SMS codes need `SMS_PROVIDER=msg91|twilio` plus that provider's keys (see `.env.example`); otherwise the phone option is hidden.
- **WhatsApp**: put `WHATSAPP_PHONE_NUMBER` (E.164), `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_API_KEY` into `.env`, rerun `node scripts/chatwoot-setup.mjs`, then in the Meta app set the webhook callback to `<public Chatwoot URL>/webhooks/whatsapp/<WHATSAPP_PHONE_NUMBER>` with the verify token from Chatwoot → Settings → Inboxes → WhatsApp → Configuration, and subscribe to `messages`. Chatwoot must be reachable from the internet for that.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `healthz` → `"chatwoot":"down"` | wait for rails boot (`docker compose logs -f rails`); rerun setup if tokens missing; recreate api |
| Chatwoot webhooks never reach the api (`SAFE_FETCH` / blocked private URL) | `SAFE_FETCH_ALLOW_PRIVATE_NETWORK=true` in `chatwoot/.env` (set by `init-env.mjs`) so Chatwoot may call `http://api:4000`; recreate rails + sidekiq after editing |
| Agent sees no conversations | agent not in the "Customer Portal" inbox: rerun `scripts/chatwoot-setup.mjs` (adds all agents) |
| rails/sidekiq OOM-killed or very slow | give Docker ≥ 4 GB RAM |
| Every ticket goes to a human | `GROQ_API_KEY` empty (`healthz` → `"groq":"missing"`) or Groq 429 twice |
| Port already in use | see Port overrides |
| Agent UI 500 on `/app` right after `make up` | vite still starting (`docker compose ps vite` not healthy yet); retry in a minute |
| `make up` fails in `npm run build` | web/api source doesn't compile; fix it or `COMPOSE_PROFILES=dev docker compose up -d --no-build` with the last image |
| api `MongoServerError: Authentication failed` | `make mongo-users` (syncs users with `.env`) |
| Agent UI blank or 500 on `/app` | `docker/chatwoot.override.yml` must set `VITE_RUBY_HOST` (vite `0.0.0.0`, rails `vite`) and `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=vite`, then `docker compose up -d --force-recreate vite rails` |
