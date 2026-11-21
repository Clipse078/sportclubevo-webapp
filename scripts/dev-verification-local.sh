#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
# shellcheck source=/dev/null
source .env
set +a
export DATABASE_URL="postgresql://fca:fca_dev@127.0.0.1:5432/sce_ds2_07g_verification"
export DIRECT_URL="$DATABASE_URL"
export SCE_DATA_ENVIRONMENT=local
export APP_ENV=local
if [[ -z "${NEXTAUTH_SECRET:-}" && -z "${AUTH_SECRET:-}" ]]; then
  export NEXTAUTH_SECRET="local-dev-verification-secret-pr-1019-not-for-deploy"
fi
export AUTH_SECRET="${AUTH_SECRET:-$NEXTAUTH_SECRET}"
exec npm run dev -- --port 3000