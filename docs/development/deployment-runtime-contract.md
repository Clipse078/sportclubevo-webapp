# Deployment Runtime Contract

_Engineering reference for SCE deployment environments. Operational, not aspirational._

---

## Environment Pipeline

```
Feature branch
  → git push / PR
  → Vercel Preview (automatic)
  → validated Preview runtime identity
  → explicitly configured Preview database target
  → no auth mutations

STAGE
  → STAGE Vercel project (Production scope, APP_ENV=stage)
  → persistent STAGE database (Neon)
  → protected persistent credentials
  → explicit migration gate (APPLY_DATABASE_MIGRATIONS=true)

Acceptance
  → Vercel Custom Environment (VERCEL_TARGET_ENV=acceptance)
  → isolated Acceptance database
  → fixture-only credentials managed by bootstrap scripts
  → no STAGE data contact

Production
  → Production Vercel project (APP_ENV=prod)
  → persistent production database
  → protected credentials
```

---

## Runtime Identity

Every deployment exposes its identity at `/api/health/diag` (requires `users.manage` permission).

The response includes three phases:

| Phase | Meaning |
|---|---|
| `CONFIGURED` | Required env vars (NEXTAUTH_SECRET, DATABASE_URL) are present. |
| `CONNECTED` | Database is reachable. |
| `IDENTITY_VALIDATED` | All of the above + env classification is valid and consistent. |

The `deployment` section includes:
- `commitSha` — exact deployed commit
- `commitRef` — branch/tag name
- `deploymentId` — Vercel deployment ID
- `deploymentUrl` — deployment-scoped host

The `database` section includes:
- `host` — database hostname only (no credentials)
- `fingerprint` — deterministic fingerprint of host+dbname (no secrets)
- `connectivity` — PASS/FAIL

---

## 60-Second Incident Procedure

When login fails on a Preview deployment:

1. **Read the runtime manifest** — `GET /api/health/diag` (must be logged in as admin, or check build logs).
2. **Compare commit/environment/database identity** — confirm `commitSha` matches the expected deployment; confirm `databaseHost` is the expected Preview DB.
3. **Inspect auth callback result** — check server-side logs for `[auth] authorize:` lines:
   - `no user found` → wrong database target
   - `user inactive` → account state issue
   - `bcrypt comparison failed` → wrong secret or stale hash
4. **Only investigate stored auth state if identities match** — if `CONFIGURED=true` and `CONNECTED=true` and `IDENTITY_VALIDATED=true`, the problem is in the stored credentials, not the deployment.
5. **Never reset credentials as a first-line fix** — credential resets destroy diagnostic evidence.

---

## Supported Preview Deployment Workflow

```
# Normal feature-branch deployment (recommended — no CLI required)
git push origin feature/my-branch
# Vercel automatically creates a Preview deployment from the PR/push.
```

If CLI deployment is needed:
```bash
# Do NOT run `vercel pull` or `vercel env pull` immediately before a deploy.
# Those commands overwrite .env.local with Development-scope variables,
# which can contaminate the build if not excluded by .vercelignore.
vercel deploy --prebuilt  # or `vercel deploy` without prior env pull
```

`.vercelignore` excludes `.env.local` and related local files so they are
never uploaded as part of the build payload.

---

## Environment Classification Rules

The canonical classifier (`lib/env.ts → classifyAppEnv`) applies these rules in order:

1. If `VERCEL_TARGET_ENV=acceptance` → **acceptance** (regardless of APP_ENV)
2. If `VERCEL_ENV=preview` (and no VERCEL_TARGET_ENV) → **preview** (overrides APP_ENV)
3. If deployed + `VERCEL_ENV=production` + `APP_ENV=stage` → **stage**
4. If deployed + `VERCEL_ENV=production` + `APP_ENV=prod` → **prod**
5. Otherwise deployed → **unknown** (privileged operations disabled)
6. Local: `APP_ENV` if set, else `NODE_ENV=test → test`, else **local**

**Key rule**: Plain Vercel Preview deployments are always classified as `preview`
even if `APP_ENV=stage` is set. `APP_ENV` cannot escalate Preview to STAGE.

---

## Deployment Preflight

Runs automatically during `npm run build` via `npm run deployment:preflight`.

The preflight checks:
- Required auth config present (NEXTAUTH_SECRET, DATABASE_URL) for deployed contexts
- DATABASE_URL is a valid postgresql:// URL
- APP_ENV is consistent with VERCEL_ENV
- No Acceptance/STAGE cross-contamination (when reference hosts are configured)
- Environment classification is not unknown in a deployed context

Local builds emit warnings for missing config but never fail — `npm run build`
remains usable without a full env configuration.

---

## Protected Persistent Authentication

The following invariants are permanently enforced in code:

| Invariant | Enforcement |
|---|---|
| `prisma/seed.ts` never writes `User.passwordHash` | No `User` upsert in seed; only tenant, permissions, roles, seasons, facilities are touched. |
| `prisma/bootstrap-admin.ts` does not overwrite `passwordHash` on re-run | `passwordHash` is in `create` only, not `update`. |
| `bootstrap-admin.ts` is blocked in STAGE/prod without `ALLOW_PASSWORD_CHANGE=true` | Environment safety check at script startup. |
| `lib/server/protected-auth-guard.ts` provides a generic guard for future scripts | Call `assertProtectedAuthAllowed(email, { isCreate })` before any automated credential mutation. |
| Protected identities are configurable | Set `PROTECTED_AUTH_IDENTITIES` (comma-separated) in addition to the hard-coded platform account. |

---

## Environment Variable Scoping (Summary)

| Variable | Preview | STAGE | Acceptance | Local |
|---|---|---|---|---|
| `DATABASE_URL` | Allowed (Preview DB) | Required | Required | Optional |
| `NEXTAUTH_SECRET` | Required | Required | Required | Optional |
| `APP_ENV` | Allowed (`preview`) | Required (`stage`) | Allowed | Optional |
| `APPLY_DATABASE_MIGRATIONS` | Forbidden | Conditional | Conditional | Optional |
| `CRON_SECRET` | Forbidden | Conditional | Forbidden | Optional |

See `docs/deployment/environment-manifest.md` for the full manifest.
