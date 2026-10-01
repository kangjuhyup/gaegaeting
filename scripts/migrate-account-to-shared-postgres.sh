#!/bin/sh
set -eu

: "${ACCOUNT_SOURCE_CONTAINER:=auth-postgres}"
: "${ACCOUNT_SOURCE_DB:=account_latest}"
: "${ACCOUNT_SOURCE_USER:=postgres}"
: "${SHARED_POSTGRES_CONTAINER:=vote-postgres}"
: "${SHARED_POSTGRES_ADMIN:=vote}"
: "${ACCOUNT_TARGET_DB:=ggt_account}"

for container in "$ACCOUNT_SOURCE_CONTAINER" "$SHARED_POSTGRES_CONTAINER"; do
  if ! docker inspect "$container" >/dev/null 2>&1; then
    echo "required container is missing: $container" >&2
    exit 1
  fi
done

backup_dir="${ACCOUNT_BACKUP_DIR:-.tmp/shared-account-backups}"
mkdir -p "$backup_dir"
stamp=$(date +%Y%m%d-%H%M%S)
source_backup="$backup_dir/account-source-$stamp.dump"
target_backup="$backup_dir/account-target-before-share-$stamp.dump"
legacy_db="${ACCOUNT_TARGET_DB}_legacy_$stamp"

docker exec "$ACCOUNT_SOURCE_CONTAINER" \
  pg_dump -U "$ACCOUNT_SOURCE_USER" -d "$ACCOUNT_SOURCE_DB" --format=custom --no-owner >"$source_backup"

target_exists=$(docker exec "$SHARED_POSTGRES_CONTAINER" \
  psql -U "$SHARED_POSTGRES_ADMIN" -d postgres -Atc \
  "SELECT 1 FROM pg_database WHERE datname = '$ACCOUNT_TARGET_DB'" || true)

if [ "$target_exists" = "1" ]; then
  docker exec "$SHARED_POSTGRES_CONTAINER" \
    pg_dump -U "$SHARED_POSTGRES_ADMIN" -d "$ACCOUNT_TARGET_DB" --format=custom --no-owner >"$target_backup"
  docker exec "$SHARED_POSTGRES_CONTAINER" \
    psql -U "$SHARED_POSTGRES_ADMIN" -d postgres --set=ON_ERROR_STOP=1 -c \
    "ALTER DATABASE \"$ACCOUNT_TARGET_DB\" RENAME TO \"$legacy_db\""
else
  target_backup='(target database did not exist)'
  legacy_db='(target database did not exist)'
fi

docker exec "$SHARED_POSTGRES_CONTAINER" \
  createdb -U "$SHARED_POSTGRES_ADMIN" -O "$SHARED_POSTGRES_ADMIN" "$ACCOUNT_TARGET_DB"
docker exec -i "$SHARED_POSTGRES_CONTAINER" \
  pg_restore -U "$SHARED_POSTGRES_ADMIN" -d "$ACCOUNT_TARGET_DB" \
  --exit-on-error --no-owner <"$source_backup"

source_tables=$(docker exec "$ACCOUNT_SOURCE_CONTAINER" \
  psql -U "$ACCOUNT_SOURCE_USER" -d "$ACCOUNT_SOURCE_DB" -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
target_tables=$(docker exec "$SHARED_POSTGRES_CONTAINER" \
  psql -U "$SHARED_POSTGRES_ADMIN" -d "$ACCOUNT_TARGET_DB" -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")

if [ "$source_tables" -ne "$target_tables" ]; then
  echo "table count mismatch after restore: source=$source_tables target=$target_tables" >&2
  exit 1
fi

echo "Account database copied to shared PostgreSQL."
echo "Source backup: $source_backup"
echo "Previous target backup: $target_backup"
echo "Previous target database: $legacy_db"
