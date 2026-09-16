# STAGE / PR Preview — pending Prisma migrations

PR Preview deployments for `sportclubevo-webapp-stage` intentionally use the
**shared STAGE database** (`SCE_DATA_ENVIRONMENT=STAGE`, fingerprint aligned with
`STAGE_DB_URL`). Preview builds **do not** apply migrations:

- `APPLY_DATABASE_MIGRATIONS` must never be Preview-scoped.
- `npm run build` runs `db:migrate:deploy-if-enabled`, which exits successfully
  without migrating when the flag is not exactly `"true"`.

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

## Historical note

STAGE may list legacy `_prisma_migrations` rows whose names are absent from the
current repo. That drift predates individual feature work. Use `migrate status`
and the **last common migration** plus the **pending** list as the operator
source of truth before applying new migrations.
