#!/usr/bin/env bash
# Runs a command with the local Supabase stack's URL and keys in the environment.
# Usage: scripts/with-local-supabase.sh npx vitest run tests/db
set -euo pipefail
eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|PUBLISHABLE_KEY|SECRET_KEY)=')"
export SUPABASE_URL="$API_URL"
export SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SECRET_KEY="$SECRET_KEY"
exec "$@"
