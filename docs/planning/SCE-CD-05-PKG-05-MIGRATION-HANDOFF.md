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

## Migration approval scope (all potential writes)

Operators must approve **every** write below before choosing an apply path.

### Path A — `npm run db:migrate:deploy-if-enabled` (canonical guarded wrapper)

Invoked only when `APPLY_DATABASE_MIGRATIONS=true` with STAGE fingerprint and `assertOperationalMutationAllowed`.

| Step | Target | Write type | Scope |
|------|--------|------------|--------|
| 1 | `_prisma_migrations` | INSERT (Prisma) | One row per applied migration in the pending queue (not PKG-05-only unless that is the sole pending migration) |
| 2 | `ClubStrategyDocumentKind` enum, `ClubStrategy`, `ClubStrategyFocusTarget`, `ClubStrategyDocumentReference` | DDL (CREATE) | Shared STAGE database — **no row backfill** |
| 3a | `Permission` | INSERT (if missing) | Up to five finance publication/share keys (`finance.publication.view`, `finance.reporting.share`, `finance.reporting.publish`, `finance.reporting.distribute`, `finance.share.manage`) |
| 3b | `RolePermission` | INSERT (idempotent upsert) | Every discovered **tenant Club Admin** role × full delegatable TENANT catalog (see below) |
| 3c | `RolePermission` | INSERT | Subset pass for `finance.reporting.distribute` on Club Admin roles (overlap with 3b) |

Post-deploy step: automatic from `lib/server/deploy-migrations-if-enabled.ts` → `scripts/post-deploy-tenant-club-admin-reconciliation.ts` (**no CLI dry-run**; always `dryRun=false`).

**Club Admin reconciliation does not modify:** custom/delegated tenant roles, `super_admin`, governance-withheld keys (`workspace.break_glass`, `workspace.governance.manage`), or any business tables (`ClubStrategy`, initiatives, finance data, etc.).

**Tenants affected (permission writes):** all `Tenant` rows with `status = ACTIVE` on the connected database. Reconciliation discovers materialized `club_admin__*` system roles **and** legacy Club Admin alias keys per tenant (`listTenantClubAdminRoleKeysForReconciliation`).

### Path B — PKG-05 migration only (no post-deploy reconciliation)

| Step | Target | Write type |
|------|--------|------------|
| 1–2 | Same as Path A steps 1–2 | `_prisma_migrations` + PKG-05 DDL only |

```bash
APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE \
  SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  APPLY_DATABASE_MIGRATIONS=true DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
  npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify.ts --apply
```

Refuses apply if pending migrations include anything other than `20261115150000_sce_cd_05_club_strategy_authoring`. Reports `postDeployClubAdminReconciliation: SKIPPED_BY_AUTHORIZATION_SCOPE` (same pattern as SCE-CD-04R2).

### Dry-run / drift inventory (read-only, no writes)

| Mechanism | Dry-run? | Purpose |
|-----------|----------|---------|
| `scripts/post-deploy-tenant-club-admin-reconciliation.ts` | **No** | Live reconciliation only |
| `scripts/sync-tenant-club-admin-permissions.ts` | **Yes** (default); `APPLY_PERMISSION_SYNC=true` to apply | Full catalog pass only (not finance pre-passes) |
| Reconciliation libraries (`reconcile*`, second arg) | **Yes** when `dryRun=true` | Not wired to the post-deploy entrypoint |
| `scripts/sce-cd-05-pkg-05-post-deploy-reconciliation-dry-run.ts` | **Yes** | STAGE fingerprint-gated pair-count inventory mirroring post-deploy scope |

**STAGE inventory (designated Neon, fingerprint `acd3b37682911890`, 15 Nov 2026 ~17:05 CET):**

- Migration `20261115150000_sce_cd_05_club_strategy_authoring`: **pending** (not applied).
- `47` active tenants; `20` Club Admin roles targeted for reconciliation.
- Post-deploy drift: **`0` missing `RolePermission` pairs** (`2900/2900` catalog pairs present); **`0` finance publication keys** missing from `Permission`.
- A guarded full deploy today would therefore perform **PKG-05 DDL + migration registry** writes; post-deploy reconciliation would be **no-op** on current STAGE drift (still must be in approval scope).

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

# If migration pending (Path B — PKG-05 DDL only; preferred for PO acceptance):
APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE \
  SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 APPLY_DATABASE_MIGRATIONS=true \
  DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
  npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify.ts --apply

# Optional post-deploy drift inventory (read-only):
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
  npx tsx scripts/sce-cd-05-pkg-05-post-deploy-reconciliation-dry-run.ts

# Path A — full wrapper (also runs Club Admin reconciliation):
# APP_ENV=stage NODE_ENV=production APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled

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