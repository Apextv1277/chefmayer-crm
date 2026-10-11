#!/usr/bin/env bash
# Teste la migration et les règles d'accès sur une base Postgres jetable.
# Usage : DATABASE_URL=postgres://… supabase/tests/executer.sh
set -euo pipefail
cd "$(dirname "$0")"
psql_() { PGOPTIONS="-c client_min_messages=notice" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -t -A "$@"; }
psql_ -f stub_supabase.sql
psql_ -f ../migrations/0001_crm_chef_mayer.sql
psql_ -f rls.test.sql
echo "Tests SQL réussis."
