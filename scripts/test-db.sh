#!/usr/bin/env bash
# Runs the pgTAP database tests against the local Supabase database.
# Each test file runs in a transaction that is rolled back.
set -euo pipefail
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
status=0
for f in "$(dirname "$0")"/../supabase/tests/database/*.test.sql; do
  echo "# $f"
  out="$(psql "$DB_URL" -X -q -A -t -v ON_ERROR_STOP=1 -f "$f" 2>&1)" || { echo "$out"; status=1; continue; }
  echo "$out" | grep -E '^(ok|not ok|#)' || true
  if echo "$out" | grep -q '^not ok'; then status=1; fi
  echo "$out" | grep -qE '^# Looks like you failed' && status=1
done
exit $status
