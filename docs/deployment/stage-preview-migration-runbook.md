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
