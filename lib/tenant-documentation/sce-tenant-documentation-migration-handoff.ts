/**
 * PR #1025 — Tenant Documentation migration chain (read-only metadata for verifiers).
 */

export const SCE_TENANT_DOCUMENTATION_FOUNDATION_MIGRATION =
  "20261121160000_sce_tenant_documentation_foundation" as const;

export const SCE_TENANT_DOCUMENTATION_MENTIONS_MIGRATION =
  "20261121170000_sce_tenant_documentation_mentions" as const;

export const SCE_TENANT_DOCUMENTATION_PAGE_LIFECYCLE_MIGRATION =
  "20261122180000_sce_tenant_documentation_page_lifecycle" as const;

export const SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER = [
  SCE_TENANT_DOCUMENTATION_FOUNDATION_MIGRATION,
  SCE_TENANT_DOCUMENTATION_MENTIONS_MIGRATION,
  SCE_TENANT_DOCUMENTATION_PAGE_LIFECYCLE_MIGRATION,
] as const;

export const SCE_TENANT_DOCUMENTATION_PERMISSION_SYNC_OPERATION =
  "sync-tenant-documentation-permissions" as const;

/** Narrow STAGE reconcile: club_admin__fc-allschwil only (no catalog / cross-tenant sweep). */
export const SCE_TENANT_DOCUMENTATION_FCA_CLUB_ADMIN_SYNC_OPERATION =
  "sync-tenant-documentation-club-admin-fca" as const;