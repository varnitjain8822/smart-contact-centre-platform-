# One profile at a time: dev and prod share the `api` / `rails` network names.
DC := docker compose
DEV_ONLY  := rails sidekiq vite mailhog web api
PROD_ONLY := caddy rails-prod sidekiq-prod api-prod
DIR ?= $(lastword $(sort $(wildcard backups/*)))

.PHONY: up prod down backup restore e2e logs mongo-users

up:	## dev: Chatwoot http://localhost:$$CW_PORT, portal http://localhost:$$WEB_PORT
	$(DC) rm -sf $(PROD_ONLY)
	COMPOSE_PROFILES=dev $(DC) up -d --wait mongo
	$(MAKE) mongo-users
	COMPOSE_PROFILES=dev $(DC) build api web
	COMPOSE_PROFILES=dev $(DC) up -d --remove-orphans

prod:	## prod: https://smartcc.localhost + https://agent.smartcc.localhost (first Chatwoot build ~15 min)
	{ head -1 docker/chatwoot.Dockerfile; cat chatwoot/docker/Dockerfile; } > docker/chatwoot.Dockerfile.new && mv docker/chatwoot.Dockerfile.new docker/chatwoot.Dockerfile
	$(DC) rm -sf $(DEV_ONLY)
	COMPOSE_PROFILES=prod $(DC) up -d --wait mongo postgres redis
	$(MAKE) mongo-users
	COMPOSE_PROFILES=prod $(DC) build api-prod caddy           # Chatwoot image: built on first run; after fork changes `docker compose --profile prod build rails-prod`
	COMPOSE_PROFILES=prod $(DC) run --rm --no-deps rails-prod bundle exec rails db:chatwoot_prepare
	COMPOSE_PROFILES=prod $(DC) up -d --remove-orphans

down:
	$(DC) --profile dev --profile prod down --remove-orphans

mongo-users:	## create/refresh mongo root + app user from .env (idempotent)
	$(DC) exec -T mongo mongosh --quiet /docker-entrypoint-initdb.d/mongo-init.js

backup:
	scripts/backup.sh

restore:	## make restore [DIR=backups/<timestamp>] (default: latest)
	scripts/restore.sh $(DIR)

e2e:	## dev stack + Groq stub, then Playwright
	COMPOSE_PROFILES=dev $(DC) -f docker-compose.yml -f docker-compose.e2e.yml up -d --force-recreate api groq-stub sidekiq
	# v4: the acme fixture company for e2e/tests/v4.spec.ts (removed again afterwards)
	$(DC) cp api/test/fixtures/companies api:/tmp/e2e-companies
	$(DC) exec -T -e COMPANIES_DIR=/tmp/e2e-companies api npm run seed:companies
	cd e2e && npx playwright test; s=$$?; cd .. && $(DC) exec -T api npm run seed:companies -- --remove acme; exit $$s

logs:	## make logs [S="api rails"]
	$(DC) --profile dev --profile prod logs -f --tail=100 $(S)
