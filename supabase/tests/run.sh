#!/usr/bin/env bash
# Applies the shim + all migrations + seed to a fresh local database, then runs the SQL tests.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres supabase/tests/run.sh
# Requires local Postgres 15+ with PostGIS available.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${TEST_DB:-kape_test}
dropdb --if-exists "$DB"
createdb "$DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -c "alter database $DB set search_path = \"\$user\", public, extensions;"
run() { psql -v ON_ERROR_STOP=1 -q -X -d "$DB" -f "$1"; }
run supabase/tests/_supabase_shim.sql
for f in supabase/migrations/*.sql; do echo "migrate: $f"; run "$f"; done
run supabase/seed.sql
for f in supabase/tests/*.test.sql; do echo "test: $f"; run "$f"; done
echo "All database tests passed."
