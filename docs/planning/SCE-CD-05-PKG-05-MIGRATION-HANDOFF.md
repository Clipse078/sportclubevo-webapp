# SCE-CD-05 PKG-05 — migration handoff (PO acceptance)

**Migration:** `20261115150000_sce_cd_05_club_strategy_authoring`  
**Branch:** `cursor/sce-strategy-backlog-sprints-01`  
**Baseline:** `0c99f5c52b940cd49431dc83ebd9a8f856415eea`

## Intended preview database

PR Preview deployments for **`sportclubevo-webapp-stage`** use the **shared STAGE Neon database** (`SCE_DATA_ENVIRONMENT=STAGE`, canonical fingerprint `acd3b37682911890`, host fragment `ep-wispy-hall-aso93dy6`). Preview builds do **not** apply migrations automatically.

Reference: `docs/deployment/stage-preview-migration-runbook.md`.

## Read-only verification

```bash
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
  npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify-readonly.ts
```

Inspect JSON output only — no credentials in logs. `writePerformed` is always `false`.

Alternatively: `APP_ENV=stage npx prisma migrate status` and confirm whether `20261115150000_sce_cd_05_club_strategy_authoring` is pending.

## Additive changes (existing data impact)

| Object | Change |
|--------|--------|
| Enum `ClubStrategyDocumentKind` | **New** (`LEITBILD`, `STRATEGY_AGREED`, `SUPPORTING`) |
| Table `ClubStrategy` | **New** — one row per tenant (`tenantId` unique); nullable text/JSON fields |
| Table `ClubStrategyFocusTarget` | **New** junction to `Target` |
| Table `ClubStrategyDocumentReference` | **New** — FK to `WorkspaceDocumentVersion` (`ON DELETE RESTRICT`) |
| Columns `linkedMeetingRefs`, `linkedDecisionRefs` | **New JSONB** on `ClubStrategy` (no backfill required) |

**Existing rows:** unaffected until first Strategie save per tenant. No destructive DDL.

## Deployment order

1. Merge PKG-05 branch (this package does **not** merge PR #980).
2. Operator: STAGE identity checks (fingerprint, not production).
3. Apply **only** pending additive migrations (guarded deploy — see runbook step 3).
4. Re-run read-only verify script → `schemaReady.clubStrategyTable: true`.
5. PO acceptance on Preview URL after deploy (PKG-03 UAT track optional).

## Scoped execution (operators)

```bash
APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE \
  SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
  npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify-readonly.ts

# If migration pending:
APP_ENV=stage NODE_ENV=production APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled

# Confirm:
APP_ENV=stage NODE_ENV=production npx prisma migrate status
```

Do **not** use `prisma db push`, `migrate reset`, or manual DDL.

## Recovery

- Migration is additive; **no rollback migration** is required for PO acceptance.
- Forward-fix only if a partial apply is suspected: inspect `_prisma_migrations`, compare checksum to repo `migration.sql`, apply missing objects via a **new** additive migration — never drop shared STAGE data.
- `ClubStrategy` row loss would only affect club strategy text/links; `Target` / meetings / workspace data are untouched.

## Out of scope for this handoff

- Remote apply in this agent run (not executed).
- Production promotion.
- PR #980 (Organigramm) — leave untouched.