/**
 * PR #1025 — Tenant Documentation migration chain (read-only metadata for verifiers).
 */

export const SCE_TENANT_DOCUMENTATION_FOUNDATION_MIGRATION =
  "20261121160000_sce_tenant_documentation_foundation" as const;

export const SCE_TENANT_DOCUMENTATION_MENTIONS_MIGRATION =
  "20261121170000_sce_tenant_documentation_mentions" as const;

export const SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER = [
  SCE_TENANT_DOCUMENTATION_FOUNDATION_MIGRATION,
  SCE_TENANT_DOCUMENTATION_MENTIONS_MIGRATION,
] as const;

export const SCE_TENANT_DOCUMENTATION_PERMISSION_SYNC_OPERATION =
  "sync-tenant-documentation-permissions" as const;