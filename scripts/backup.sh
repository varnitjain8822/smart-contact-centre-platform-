#!/bin/sh
# Backup → backups/<UTC timestamp>/: mongo (smartcc db), Chatwoot postgres, api uploads volume, Chatwoot storage.
# Works with either profile running (needs mongo + postgres up). Prints the backup dir.
set -eu
cd "$(dirname "$0")/.."
umask 077                                          # dumps contain customer data
PG_DB=${PG_DB:-chatwoot_dev}                        # both profiles use this database (see docker-compose.yml)
dir="backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$dir"
dc="docker compose"

$dc exec -T mongo sh -c 'mongodump --quiet --archive --gzip --db smartcc -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' > "$dir/mongo.archive.gz"
$dc exec -T postgres pg_dump -U postgres -Fc "$PG_DB" > "$dir/chatwoot.pgdump"
if docker volume inspect smartcc_uploads >/dev/null 2>&1; then
  docker run --rm -v smartcc_uploads:/data:ro alpine tar czf - -C /data . > "$dir/uploads.tar.gz"
fi
if [ -d chatwoot/storage ]; then tar czf "$dir/chatwoot-storage.tar.gz" -C chatwoot storage; fi
echo "$dir"
