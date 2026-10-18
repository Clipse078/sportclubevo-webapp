# SCE-ENV-01 — Environment matrix (names/scopes only)

**Updated:** SCE-PERF-02A @ STAGE `9e4748bbb1eb8daae5ec97c0f8b9a8d6a84932a8`  
No secret values. Status: **VERIFIED** = observed this run; **DOCUMENTED ONLY** = repo/operator docs; **UNKNOWN** = not confirmed; **CONFLICT** = sources disagree.

| Item | STAGE | PROD (documented target) | Preview | Notes |
| --- | --- | --- | --- | --- |
| Vercel project (WebApp) | `fc-allschwil-webapp-stage` / `sportclubevo-webapp-stage` (DOCUMENTED ONLY) | `fc-allschwil-webapp-prod` (DOCUMENTED ONLY) | Feature-branch deploys (DOCUMENTED ONLY) | Two naming schemes in docs |
| Vercel project ID | UNKNOWN | UNKNOWN | UNKNOWN | Not in repo |
| Git branch | `STAGE` (VERIFIED tip `9e4748bb`) | `main` (DOCUMENTED ONLY) | PR branches | |
| Tracked release | STAGE continuous (DOCUMENTED ONLY) | main → prod (DOCUMENTED ONLY) | | |
| Public WebApp domain | `fcallschwil.sportclubevo.com` serves **STAGE** app (VERIFIED via `/api/health/diag` 2026-09-29) | Same URL documented as PROD canonical (**CONFLICT**) | `*.vercel.app` | Deployed SHA matches STAGE |
| Alternate STAGE domain | `stage-webapp.fcallschwil.ch` (DOCUMENTED ONLY; not re-tested DNS this run) | — | | |
| Acceptance domain | `acceptance.sportclubevo.com` (VERIFIED: Vercel Authentication wall on `/api/health/diag`) | — | Custom env (DOCUMENTED ONLY) | |
| Deployed commit (canonical domain) | `9e4748bbb1eb8daae5ec97c0f8b9a8d6a84932a8` (VERIFIED) | UNKNOWN for true PROD | UNKNOWN | |
| `VERCEL_ENV` (canonical domain) | `production` (VERIFIED) | — | typically `preview` | Vercel **target**, not app tier |
| `APP_ENV` / public label | `STAGE` (VERIFIED) | `prod` (DOCUMENTED ONLY) | `preview` / credential-poor (DOCUMENTED ONLY) | |
| `SCE_DATA_ENVIRONMENT` | `STAGE` (DOCUMENTED ONLY) | `PRODUCTION` (DOCUMENTED ONLY) | DOCUMENTED ONLY | |
| Neon host (runtime) | `ep-wispy-hall-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech` (VERIFIED public diag) | UNKNOWN | Forbidden shared STAGE URL per manifest | eu-central-1 |
| DB fingerprint | `acd3b37682911890` (VERIFIED STAGE diag + authorized local `DATABASE_URL`) | UNKNOWN | Must differ if isolated | |
| Function region | UNKNOWN | UNKNOWN | UNKNOWN | Not exposed in public diag |
| Blob public store | names in manifest (DOCUMENTED ONLY) | separate (DOCUMENTED ONLY) | Forbidden copy (DOCUMENTED ONLY) | |
| Workspace blob | DOCUMENTED ONLY | DOCUMENTED ONLY | Forbidden | |
| OPS backup blob | DOCUMENTED ONLY | DOCUMENTED ONLY | Forbidden | |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Required STAGE (DOCUMENTED ONLY) | Unique prod (DOCUMENTED ONLY) | Forbidden shared | |
| Auth callback origin | STAGE URLs in entry sheet (DOCUMENTED ONLY) | `fcallschwil.sportclubevo.com` (DOCUMENTED ONLY) | benign URLs allowed | |
| Resend / email | STAGE conditional (DOCUMENTED ONLY) | PROD conditional | Forbidden keys | |
| SFV credentials | STAGE/PROD conditional (DOCUMENTED ONLY) | live integration | Forbidden Preview | |
| Stripe | test on STAGE (DOCUMENTED ONLY) | live on PROD (DOCUMENTED ONLY) | Forbidden | |
| `SCE_BILLING_ENCRYPTION_KEY` | STAGE scope (DOCUMENTED ONLY) | PROD scope | Preview may mirror STAGE if shared DB (**CONFLICT** with Preview isolation) | |
| `CRON_SECRET` | STAGE conditional | PROD conditional | Forbidden | Enables cron routes when set |
| Cron routes | `/api/cron/*` in `vercel.json` (DOCUMENTED ONLY) | same codebase | should no-op without secret | Side effects if creds present |
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

1. **Preview (choose one):**  
   - **Build-only Preview:** non-functional for authenticated acceptance (manifest-aligned).  
   - **Functional Preview/Acceptance:** isolated data + credentials, or explicit labeled “STAGE-data Preview” with allowlisted secrets and no cron/email side effects.  
2. **Persistent STAGE:** independent test resources; label `fcallschwil.sportclubevo.com` as “canonical STAGE (Vercel production target)” until PROD is verified.  
3. **PROD:** provision `fc-allschwil-webapp-prod` with new Neon branch/database, unique secrets, `APP_ENV=prod`, migrate traffic only after gates.  
4. Remove contradictory Preview paragraphs between `environment-manifest.md` and `stage-preview-migration-runbook.md` in a dedicated ENV doc PR (E1).
