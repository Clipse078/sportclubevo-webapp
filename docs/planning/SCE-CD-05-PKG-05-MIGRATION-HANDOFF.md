# SCE-CD-05 PKG-05 — migration handoff (PO acceptance)

**Migration:** `20261115150000_sce_cd_05_club_strategy_authoring`  
**Canonical STAGE branch:** `STAGE` (baseline for operator docs reconciliation: `504ed5ba2e5bfbedf2609729ba887727b9460854`)

## Intended preview database

PR Preview deployments for **`sportclubevo-webapp-stage`** use the **shared STAGE Neon database** (`SCE_DATA_ENVIRONMENT=STAGE`, canonical fingerprint `acd3b37682911890`, host fragment `ep-wispy-hall-aso93dy6`). Preview builds do **not** apply migrations automatically.

Reference: `docs/deployment/stage-preview-migration-runbook.md`.

## STAGE acceptance application

Post-merge STAGE tenant surface (verified deployment matrix — not inferred from project slug):

**https://fcallschwil.sportclubevo.com**

See `docs/deployment/vercel-project-matrix.md` and `docs/deployment/stage-preview-migration-runbook.md`.

## Completed STAGE operations (do not repeat)

These operations are **finished** on designated STAGE (`acd3b37682911890`). Operators must **not** re-apply PKG-05 migration or re-run the narrow `tasks.delete` reconciliation.

| Operation | Status | Evidence |
|-----------|--------|----------|
| `20261115150000_sce_cd_05_club_strategy_authoring` | **Applied and verified** | Read-only verify JSON: `migration.applied: true`, `pendingClubStrategyMigrations: []` |
| `tasks.delete` on `super_admin` and `club_admin__fc-allschwil` | **Granted** (narrow PKG-03 reconciliation) | `docs/planning/PKG-03-TASKS-DELETE-PERMISSION-PROPOSAL.md` |

Production databases and promotion paths remain **out of scope** and unauthorised in this handoff.

## Read-only verification

```bash
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
  npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify-readonly.ts
```

Inspect JSON output only — no credentials in logs. `writePerformed` is always `false`.

Alternatively: `APP_ENV=stage npx prisma migrate status` and confirm `20261115150000_sce_cd_05_club_strategy_authoring` is **not** pending.

### PKG-05 STAGE reconciliation record

| Field | Value |
|-------|--------|
| `migration.applied` | `true` |
| `migration.finishedAt` | `2026-11-15T16:21:42.561Z` |
| `migration.checksumMatch` | `true` |
| `schemaReady.clubStrategyTable` | `true` |
| `pendingClubStrategyMigrations` | `[]` |

## Migration approval scope (all potential writes)

Reference material for **future** guarded deploys. PKG-05 on STAGE is already applied — Path A/B below are **not** to be executed again for this migration.

Operators must approve **every** write below before choosing an apply path on a database that still has pending PKG-05 DDL.

### Path A — `npm run db:migrate:deploy-if-enabled` (canonical guarded wrapper)

Invoked only when `APPLY_DATABASE_MIGRATIONS=true` with STAGE fingerprint and `assertOperationalMutationAllowed`.

| Step | Target | Write type | Scope |
|------|--------|------------|--------|
| 1 | `_prisma_migrations` | INSERT (Prisma) | One row per applied migration in the pending queue (not PKG-05-only unless that is the sole pending migration) |
| 2 | `ClubStrategyDocumentKind` enum, `ClubStrategy`, `ClubStrategyFocusTarget`, `ClubStrategyDocumentReference` | DDL (CREATE) | Shared STAGE database — **no row backfill** |
| 3a | `Permission` | INSERT (if missing) | Up to five finance publication/share keys |
| 3b | `RolePermission` | INSERT (idempotent upsert) | Every discovered **tenant Club Admin** role × full delegatable TENANT catalog |
| 3c | `RolePermission` | INSERT | Subset pass for `finance.reporting.distribute` on Club Admin roles (overlap with 3b) |

Post-deploy step: automatic from `lib/server/deploy-migrations-if-enabled.ts` → `scripts/post-deploy-tenant-club-admin-reconciliation.ts` (**no CLI dry-run**; always `dryRun=false`).

**Club Admin reconciliation does not modify:** custom/delegated tenant roles, `super_admin`, governance-withheld keys, or business tables (`ClubStrategy`, initiatives, finance data, etc.).

### Path B — PKG-05 migration only (no post-deploy reconciliation)

| Step | Target | Write type |
|------|--------|------------|
| 1–2 | Same as Path A steps 1–2 | `_prisma_migrations` + PKG-05 DDL only |

```bash
# Only when migration is still pending — refused / no-op when already applied.
APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE \
  SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  APPLY_DATABASE_MIGRATIONS=true DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
  npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify.ts --apply
```

Refuses apply if pending migrations include anything other than `20261115150000_sce_cd_05_club_strategy_authoring`. Skips `apply` when PKG-05 is already recorded in `_prisma_migrations`. Reports `postDeployClubAdminReconciliation: SKIPPED_BY_AUTHORIZATION_SCOPE`.

### Dry-run / drift inventory (read-only, no writes)

| Mechanism | Dry-run? | Purpose |
|-----------|----------|---------|
| `scripts/post-deploy-tenant-club-admin-reconciliation.ts` | **No** | Live reconciliation only |
| `scripts/sync-tenant-club-admin-permissions.ts` | **Yes** (default); `APPLY_PERMISSION_SYNC=true` to apply | Full catalog pass only |
| `scripts/sce-cd-05-pkg-05-post-deploy-reconciliation-dry-run.ts` | **Yes** | STAGE fingerprint-gated pair-count inventory mirroring post-deploy scope |
| `scripts/sce-cd-05-pkg-05-stage-migration-verify.ts` (default / `--phase=pre`) | **Yes** | Designated STAGE identity + schema inventory; `--apply` requires `APPLY_DATABASE_MIGRATIONS=true` |

**Designated STAGE (`acd3b37682911890`) as of 2026-11-16:** PKG-05 migration **applied**; post-deploy Club Admin catalog pairs were already complete before guarded full deploy would have run reconciliation (0 missing pairs at 2026-11-15 inventory).

## Additive changes (existing data impact)

| Object | Change |
|--------|--------|
| Enum `ClubStrategyDocumentKind` | **New** (`LEITBILD`, `STRATEGY_AGREED`, `SUPPORTING`) |
| Table `ClubStrategy` | **New** — one row per tenant (`tenantId` unique); nullable text/JSON fields |
| Table `ClubStrategyFocusTarget` | **New** junction to `Target` |
| Table `ClubStrategyDocumentReference` | **New** — FK to `WorkspaceDocumentVersion` (`ON DELETE RESTRICT`) |
| Columns `linkedMeetingRefs`, `linkedDecisionRefs` | **New JSONB** on `ClubStrategy` (no backfill required) |

**Existing rows:** unaffected until first Strategie save per tenant. No destructive DDL.

## Deployment order (current STAGE)

1. Application code on `STAGE` includes PKG-05 schema expectations (merged via #985 / follow-ons).
2. PKG-05 migration on shared STAGE Neon is **already applied** — no operator DDL step.
3. PO / engineering acceptance on **https://fcallschwil.sportclubevo.com** (`/vereinsleitung/strategie` persistence, Vereinsentwicklung workspaces).
4. Use read-only scripts below for drift checks only; do not rerun PKG-05 apply.

## Scoped execution (operators)

```bash
# Read-only PKG-05 inventory (preferred on STAGE today):
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
  npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify-readonly.ts

# Optional post-deploy drift inventory (read-only):
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
  npx tsx scripts/sce-cd-05-pkg-05-post-deploy-reconciliation-dry-run.ts

# Optional designated-STAGE verify (read-only unless --apply + APPLY_DATABASE_MIGRATIONS=true):
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
  npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify.ts --phase=pre

# Confirm:
APP_ENV=stage npx prisma migrate status
```

Do **not** use `prisma db push`, `migrate reset`, or manual DDL. Do **not** rerun Path B for PKG-05 on current STAGE.

## Recovery

- Migration is additive; **no rollback migration** is required for PO acceptance.
- Forward-fix only if a partial apply is suspected: inspect `_prisma_migrations`, compare checksum to repo `migration.sql`, apply missing objects via a **new** additive migration — never drop shared STAGE data.
- `ClubStrategy` row loss would only affect club strategy text/links; `Target` / meetings / workspace data are untouched.

## Out of scope for this handoff

- Live database writes in agent or CI runs (not executed here).
- Production promotion.
- Reconciliation PRs for Organigramm (#980) — track via separate branch targeting `STAGE`.