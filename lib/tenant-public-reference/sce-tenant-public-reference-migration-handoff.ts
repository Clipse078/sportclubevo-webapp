/**
 * SCE tenant-wide public references — migration chain metadata for verifiers.
 */

export const SCE_TENANT_PUBLIC_REFERENCES_MIGRATION =
  "20261123160000_sce_tenant_task_references" as const;

export const SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION =
  "20261124120000_sce_tenant_record_reference_columns" as const;

export const SCE_TENANT_PUBLIC_REFERENCES_MIGRATION_ORDER = [
  SCE_TENANT_PUBLIC_REFERENCES_MIGRATION,
  SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION,
] as const;

/**
 * Backfill (PO-owned, not on shared envs): assign `tenantPublicNumber` + ledger rows for
 * existing Tasks, Strategie, Ziel, and Anliegen without reusing numbers already taken
 * in the tenant sequence. Align sequence `nextNumber` after max assigned per tenant.
 */
export const SCE_TENANT_PUBLIC_REFERENCE_BACKFILL_SCOPE =
  "tenant-public-number-ledger-and-record-columns" as const;

/**
 * Deployment order (#1028 foundation, then record-detail PR):
 *
 * 1. Apply `20261123160000_sce_tenant_task_references` on the target database (additive DDL).
 * 2. Apply `20261124120000_sce_tenant_record_reference_columns` (Strategie/Ziel/Anliegen columns).
 * 3. Deploy application build that issues and resolves tenant references for all four record kinds.
 * 4. Configure `Tenant.publicReferenceShortCode` per club (e.g. `FCA`) when enabling issuance.
 *
 * Pre-schema app safety: an older build keeps serving on the migrated database (new columns/tables
 * are unused). This build on a database **without** the migrations will fail on create paths that
 * touch `SceTenantPublicNumberSequence`, ledger, or `tenantPublicNumber` columns — migrate before deploy.
 *
 * New records vs backfill:
 * - **New records:** after migration + short code on the tenant, create flows allocate ledger + column.
 * - **Existing records:** separate backfill runner only (`SCE_TENANT_PUBLIC_REFERENCE_BACKFILL_SCOPE`);
 *   not invoked by this verifier or shared-env promotion.
 */
export const SCE_TENANT_PUBLIC_REFERENCE_DISPOSABLE_VERIFY_SCRIPT =
  "scripts/sce-tenant-task-references-disposable-migration-verify.ts" as const;