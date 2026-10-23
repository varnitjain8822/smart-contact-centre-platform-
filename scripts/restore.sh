#!/bin/sh
# Restore a backup made by scripts/backup.sh. Destructive: replaces the smartcc mongo db and the Chatwoot database.
# Usage: scripts/restore.sh backups/<timestamp>
set -eu
cd "$(dirname "$0")/.."
dir=${1:?usage: scripts/restore.sh backups/<timestamp>}
[ -f "$dir/mongo.archive.gz" ] && [ -f "$dir/chatwoot.pgdump" ] || { echo "not a backup dir: $dir" >&2; exit 1; }
PG_DB=${PG_DB:-chatwoot_dev}
dc="docker compose"

# stop writers (whichever profile is running), restart them at the end
apps=$($dc ps --services --status running | grep -xE 'api|api-prod|rails|rails-prod|sidekiq|sidekiq-prod' || true)
[ -z "$apps" ] || $dc stop $apps

$dc exec -T mongo sh -c 'mongorestore --quiet --archive --gzip --drop --nsInclude "smartcc.*" -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' < "$dir/mongo.archive.gz"
$dc exec -T postgres pg_restore -U postgres --clean --if-exists --no-owner -d "$PG_DB" < "$dir/chatwoot.pgdump"
# ponytail: files are extracted over the existing ones (nothing deleted); files added after the backup stay as orphans
if [ -f "$dir/uploads.tar.gz" ]; then docker run --rm -i -v smartcc_uploads:/data alpine tar xzf - -C /data < "$dir/uploads.tar.gz"; fi
if [ -f "$dir/chatwoot-storage.tar.gz" ]; then tar xzf "$dir/chatwoot-storage.tar.gz" -C chatwoot; fi

[ -z "$apps" ] || $dc start $apps
echo "restored $dir"
