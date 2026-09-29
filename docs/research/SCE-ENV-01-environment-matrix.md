# SCE-ENV-01 — Environment matrix (names/scopes only)

No secret values. Status: **VERIFIED** = observed this run; **DOCUMENTED ONLY** = repo/operator docs; **UNKNOWN** = not confirmed; **CONFLICT** = sources disagree.

| Item | STAGE | PROD (documented target) | Preview | Notes |
| --- | --- | --- | --- | --- |
| Vercel project (WebApp) | `sportclubevo-webapp-stage` / `fc-allschwil-webapp-stage` (DOCUMENTED ONLY) | `fc-allschwil-webapp-prod` (DOCUMENTED ONLY) | Feature-branch deploys (DOCUMENTED ONLY) | Two naming schemes in docs |
| Vercel project ID | UNKNOWN | UNKNOWN | UNKNOWN | Not in repo |
| Git branch | `STAGE` (VERIFIED tip `9e4748bb`) | `main` (DOCUMENTED ONLY) | PR branches | |
| Tracked release | STAGE continuous (DOCUMENTED ONLY) | main → prod (DOCUMENTED ONLY) | | |
| Public WebApp domain | `fcallschwil.sportclubevo.com` serves **STAGE** app (VERIFIED via `/api/health/diag`) | Same URL documented as PROD canonical (CONFLICT) | `*.vercel.app` | See conflict row |
| Alternate STAGE domain | `stage-webapp.fcallschwil.ch` (DOCUMENTED ONLY; DNS failed from audit VM) | — | | |
| Acceptance domain | `acceptance.sportclubevo.com` (VERIFIED: Vercel auth wall) | — | Custom env (DOCUMENTED ONLY) | |
| Deployed commit (canonical domain) | `9e4748bbb1eb8daae5ec97c0f8b9a8d6a84932a8` (VERIFIED) | UNKNOWN for true PROD | UNKNOWN | |
| `VERCEL_ENV` (canonical domain) | `production` (VERIFIED) | — | typically `preview` | Vercel **target**, not app tier |
| `APP_ENV` / public label | `STAGE` (VERIFIED) | `prod` (DOCUMENTED ONLY) | `preview` / credential-poor (DOCUMENTED ONLY) | |
| `SCE_DATA_ENVIRONMENT` | `STAGE` (DOCUMENTED ONLY) | `PRODUCTION` (DOCUMENTED ONLY) | DOCUMENTED ONLY | |
| Neon host (runtime) | `ep-wispy-hall-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech` (VERIFIED public diag) | UNKNOWN | Forbidden shared STAGE URL per manifest | |
| DB fingerprint | `acd3b37682911890` (VERIFIED STAGE) | UNKNOWN | Must differ if isolated | Matches WORKSPACE-08 STAGE record |
| Blob public store | names in manifest (DOCUMENTED ONLY) | separate (DOCUMENTED ONLY) | Forbidden copy (DOCUMENTED ONLY) | |
| Workspace blob | DOCUMENTED ONLY | DOCUMENTED ONLY | Forbidden | |
| OPS backup blob | DOCUMENTED ONLY | DOCUMENTED ONLY | Forbidden | |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Required STAGE (DOCUMENTED ONLY) | Unique prod (DOCUMENTED ONLY) | Forbidden shared | |
| Auth callback origin | STAGE URLs in entry sheet (DOCUMENTED ONLY) | `fcallschwil.sportclubevo.com` (DOCUMENTED ONLY) | benign URLs allowed | |
| Resend / email | STAGE conditional (DOCUMENTED ONLY) | PROD conditional | Forbidden keys | |
| SFV credentials | STAGE/PROD conditional (DOCUMENTED ONLY) | live integration | Forbidden Preview | |
| Stripe | test on STAGE (DOCUMENTED ONLY) | live on PROD (DOCUMENTED ONLY) | Forbidden | |
| `SCE_BILLING_ENCRYPTION_KEY` | STAGE scope (DOCUMENTED ONLY) | PROD scope | Preview may mirror STAGE if shared DB (CONFLICT with Preview isolation) | |
| `CRON_SECRET` | STAGE conditional | PROD conditional | Forbidden | Enables cron routes when set |
| Cron routes | `/api/cron/*` (DOCUMENTED ONLY) | same codebase | should no-op without secret | Side effects if creds present |
| Webhooks | Resend/Blob/backup keys separate per manifest | DOCUMENTED ONLY | Forbidden | |
| Scheduled delivery | Email/push/billing depend on provider flags | DOCUMENTED ONLY | Disabled when credential-poor | STAGE can send if configured |

## Isolation summary

| Check | Status |
| --- | --- |
| STAGE DB fingerprint locally authorized | VERIFIED equals STAGE diag |
| PROD DB distinct from STAGE | UNKNOWN (no PROD diag without credentials) |
| PROD project live with `APP_ENV=prod` | UNKNOWN |
| Canonical domain points at STAGE data | VERIFIED — **CONFLICT** with PROD naming in matrix docs |
| Preview vs STAGE DB | **CONFLICT** manifest vs `stage-preview-migration-runbook.md` |

## Recommended policy (no remote change in this package)

1. **Preview:** Choose manifest-strict (no STAGE DB) **or** explicit “STAGE-data preview” mode documented in one place; remove contradictory paragraphs.  
2. **Production:** Provision `fc-allschwil-webapp-prod` with new Neon branch/database, unique secrets, `APP_ENV=prod`, and migrate traffic only after perf/onboarding gates.  
3. **Operator language:** Until PROD is verified, call `fcallschwil.sportclubevo.com` “canonical STAGE (Vercel production target)” in runbooks.
