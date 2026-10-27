# STAGE / PR Preview — pending Prisma migrations

PR Preview deployments for `sportclubevo-webapp-stage` intentionally use the
**shared STAGE database** (`SCE_DATA_ENVIRONMENT=STAGE`, fingerprint aligned with
`STAGE_DB_URL`). Preview builds **do not** apply migrations:

- `APPLY_DATABASE_MIGRATIONS` must never be Preview-scoped.
- `npm run build` does **not** run `prisma migrate deploy` (no advisory-lock
  coupling). Apply pending schema with the guarded runner in step 3 below.

Therefore a PR that adds **required** schema must be followed by a **controlled
STAGE migration** before manual Preview acceptance.

## Operator procedure (non-Production only)

1. Confirm the target is STAGE, not Production:
   - Neon host matches the known STAGE cluster (see `lib/test/safe-test-database.ts`).
   - `DATABASE_URL` / `DIRECT_URL` fingerprint matches `STAGE_DB_URL`.
   - `APP_ENV` is **not** `prod`; do not set `VERCEL_ENV=production` for this run.
2. Inspect pending migrations:
   - `APP_ENV=stage NODE_ENV=production npx prisma migrate status`
3. If only additive migrations are pending and status is otherwise acceptable,
   apply once with the guarded runner (not bare `npx prisma migrate deploy`):
   - `APP_ENV=stage NODE_ENV=production APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled`
4. Re-check:
   - `npx prisma migrate status` → schema up to date
   - Spot-check new tables/columns; confirm row counts unchanged
5. Re-test the PR Preview URL (no Production deploy required).

Do **not** use `prisma db push`, `migrate reset`, or manual DDL shortcuts.

## Finance (FIN-01E) — required column before Preview UAT

PR Preview code for FIN-01E R3+ selects `FinanceBudgetVersion.baseCurrency`. If the
shared STAGE database has not applied:

- `20261022200000_sce_finance_01e_r3_budget_version_base_currency`

…Finance Settings save/reload will fail with Prisma **column does not exist** while
the UI still deploys. Apply step 3 **before** Product Owner browser UAT on Preview.

Operator verify (read-only or `--apply` as above):

- `scripts/sce-finance-01e-r4-stage-migration-verify.ts`
- `npm run finance:01e:r4:stage-migration-verify`

See also `docs/finance/SCE-FINANCE-01E-IMPLEMENTATION.md` (R4 closure).

## Finance (FIN-02B) — current baseline pointer before Preview UAT

PR Preview code for FIN-02B+ selects `FinanceBudget.currentBaselineVersionId`. If the
shared STAGE database has not applied:

- `20261022210000_sce_finance_02b_current_governance_baseline`

…Finance budget/reporting queries may fail with Prisma **column does not exist** while
the UI still deploys. Apply step 3 **before** Product Owner browser UAT on Preview.

Closure record: `docs/finance/SCE-FINANCE-02B-IMPLEMENTATION.md` (STAGE migration applied 2026-10-23).

## Finance (FIN-06E) — distribution schema + distribute permission before Preview UAT

PR Preview code for FIN-06E persists `FinancePublicationDistribution` and gates **Versenden**
on `finance.reporting.distribute`. If the shared STAGE database has not applied **both**:

- `20261026160000_sce_finance_06e_publication_distribution`
- `20261026173000_sce_finance_06e_r1_distribute_permission_backfill`

…Club Admin users who already had FIN-06D publication keys still lack
`finance.reporting.distribute` in the permission catalog and on materialized
`club_admin__*` roles; **Versenden** stays hidden in Veröffentlichungen while
**Teilen** / **Freigabe verwalten** remain visible. Apply step 3 **before**
FIN-06E Product Owner UAT on Preview.

Operator verify (read-only):

- `scripts/sce-finance-06e-r2-stage-migration-verify.ts`
- `npm run finance:06e:r2:stage-migration-verify`

### Finance (FIN-06E-R7) — external recipient access on Preview (Deployment Protection)

PR Preview deployments for `sportclubevo-webapp-stage` typically enable **Vercel Authentication**
(Deployment Protection). Unauthenticated recipients must not hit a Vercel login wall when opening
distribution capability URLs (`/share/finance/publication/{token}`).

Application code routes Preview distribution view/PDF links to the **executing deployment origin**
(`VERCEL_URL` or `PUBLIC_ACTION_BASE_URL`) so DISTRIBUTION rows resolve on FIN-06E runtime.
That routing is necessary but **not sufficient**: the origin must also be **externally reachable**
without deployment-provider authentication.

**Post-merge / normal operation:** STAGE production on `https://fcallschwil.sportclubevo.com`
remains the canonical recipient host (no `*.vercel.app` in emails).

**Pre-merge Preview UAT (choose one minimal path):**

1. **Preferred after merge readiness:** merge FIN-06E to `STAGE`, deploy production, run external
   recipient UAT on the canonical tenant domain (no Preview-only configuration).

2. **Preview-only external UAT (before merge):** in the Vercel project **Deployment Protection**
   settings, either:
   - disable Vercel Authentication for **Preview** deployments only (accept broader Preview exposure), **or**
   - attach an **unprotected custom HTTPS domain** to Preview for this branch and set Preview env:
     - `PUBLIC_ACTION_BASE_URL=https://<unprotected-preview-host>` (origin only, no path/query)
     - `PUBLIC_ACTION_EXTERNALLY_REACHABLE=confirmed` (operator attestation that anonymous access works)

   Do **not** embed `VERCEL_AUTOMATION_BYPASS_SECRET` or `x-vercel-protection-bypass` in distribution
   emails. Shareable-link query parameters are for manual sharing, not transactional recipient mail.

3. **Fail closed:** if neither path is configured, distribution send is blocked in Preview with a
   localized operator message (prevents silently emailing protected `*.vercel.app` links).

Repository guard: deployment preflight emits `FINANCE_EXTERNAL_DISTRIBUTION_NOT_READY` (warning,
does not block build) when a protected Preview would require Vercel Deployment Protection for
finance distribution links. Distribution send remains fail-closed at runtime. Preflight emits
`PREVIEW_PUBLIC_ACTION_NOT_EXTERNALLY_REACHABLE` (error) only when `PUBLIC_ACTION_BASE_URL` is
explicitly configured for FIN-06E Preview UAT but external reachability is not attested.

## Finance (FIN-06D) — controlled publication version sharing before Preview UAT

PR Preview code for FIN-06D-R2 queries `FinancePublicationShare` including `publicToken`
and `shareKind`. If the shared STAGE database has not applied **both**:

- `20261026120000_sce_finance_06d_publication_sharing`
- `20261026143000_sce_finance_06d_r2_share_public_token`

…share actions log Prisma **P2021** / **P2022** errors while Finance Reports SSR may still
render; Product Owner share UAT (**Teilen**, link copy, revoke) fails until migrations are
applied on STAGE. Apply step 3 **before** FIN-06D-R2 Preview UAT.

Operator verify (read-only):

- `scripts/sce-finance-06d-r2-stage-migration-verify.ts`
- `npm run finance:06d:r2:stage-migration-verify`

## Finance (FIN-06A) — publication & sharing foundation before Preview UAT

PR Preview code for FIN-06B+ persists `FinancePublication` and
`FinancePublicationVersion`. If the shared STAGE database has not applied:

- `20261025140000_sce_finance_06a_publishing_sharing_foundation`

…clicking **Veröffentlichen** fails at persistence (Prisma relation missing) while
the dialog still deploys. Apply step 3 **before** Product Owner FIN-06B publication UAT on Preview.

Operator verify (read-only):

- `scripts/sce-finance-06a-r1-stage-migration-verify.ts`
- `npm run finance:06a:r1:stage-migration-verify`

## Finance (FIN-03A) — actuals foundation before Preview UAT

PR Preview code for FIN-03A queries `FinanceActualEntry` and enum `FinanceActualEntrySource`. If the shared STAGE database has not applied:

- `20261023120000_sce_finance_03a_actuals_foundation`

…Finance actuals / variance reads will fail with Prisma **relation does not exist** while the UI still deploys. Apply step 3 **before** Product Owner browser UAT on Preview.

Operator verify (read-only or `--apply` as above):

- `scripts/sce-finance-03a-r1-stage-migration-verify.ts`
- `npm run finance:03a:r1:stage-migration-verify`

See also `docs/finance/SCE-FINANCE-03A-IMPLEMENTATION.md` (R1 STAGE closure).

## Historical note

STAGE may list legacy `_prisma_migrations` rows whose names are absent from the
current repo. That drift predates individual feature work. Use `migrate status`
and the **last common migration** plus the **pending** list as the operator
source of truth before applying new migrations.
