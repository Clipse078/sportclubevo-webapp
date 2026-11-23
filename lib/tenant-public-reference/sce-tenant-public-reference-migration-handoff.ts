/**
 * SCE tenant-wide public references — migration chain metadata for verifiers.
 */

export const SCE_TENANT_PUBLIC_REFERENCES_MIGRATION =
  "20261123160000_sce_tenant_task_references" as const;

export const SCE_TENANT_PUBLIC_REFERENCES_MIGRATION_ORDER = [
  SCE_TENANT_PUBLIC_REFERENCES_MIGRATION,
] as const;

/**
 * Backfill (PO-owned, not on shared envs): assign `tenantPublicNumber` + ledger rows for
 * existing Tasks (and later Strategie/Ziel/Anliegen) without reusing numbers already taken
 * in the tenant sequence. Align sequence `nextNumber` after max assigned per tenant.
 */
export const SCE_TENANT_PUBLIC_REFERENCE_BACKFILL_SCOPE =
  "tenant-public-number-ledger-and-task-column" as const;