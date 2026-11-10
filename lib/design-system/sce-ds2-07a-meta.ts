/**
 * SCE-DS2-07A — Core workspace migration (first P0 route batch).
 * @see docs/design-system-v2/20-ds2-07a-core-workspace-migration-delivery.md
 */

export const SCE_DS2_07A_PACKAGE_KEY = "SCE-DS2-07A" as const;

export const SCE_DS2_07A_PREDECESSOR = "SCE-DS2-CLEANUP-01" as const;

export const SCE_DS2_07A_SUCCESSOR = "SCE-DS2-07B" as const;

/** P0 routes migrated in this package. */
export const SCE_DS2_07A_MIGRATED_ROUTES = [
  "/dashboard/finance/income_statement",
  "/dashboard/persons/[id]/edit",
  "/dashboard/persons/new",
  "/dashboard/teams/new",
  "/dashboard/vereine/new",
] as const;

export const SCE_DS2_07A_SHARED_COMPONENT_CHANGES = [
  "components/ui/patterns/FormPagePattern.tsx — SceWorkspaceChrome composition",
  "scripts/sce-ds2-06-route-inventory-scan.mjs — FormPagePattern canonical marker",
] as const;
