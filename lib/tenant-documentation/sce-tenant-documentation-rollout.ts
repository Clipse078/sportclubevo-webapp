/**
 * STAGE rollout notes — no automatic promotion.
 */

export const SCE_TENANT_DOCUMENTATION_ROLLOUT = {
  migrationId: "20261121160000_sce_tenant_documentation_foundation",
  permissionSyncScript: "scripts/sync-tenant-documentation-permissions.ts",
  disposableVerifyScript: "scripts/sce-tenant-documentation-disposable-migration-verify.ts",
  deploymentDependencies: [
    "Postgres migrate deploy",
    "APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-tenant-documentation-permissions.ts",
    "No new blob store — collaboration state stored in Postgres BYTEA",
  ],
  previewRoute: "/dashboard/dokumentation",
  canonicalPageRoutePattern: "/dashboard/dokumentation/p/[pageId]",
} as const;