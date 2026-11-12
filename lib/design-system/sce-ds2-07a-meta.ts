/**
 * SCE-DS2-07A — Core workspace migration (first P0 route batch).
 * @see docs/design-system-v2/20-ds2-07a-core-workspace-migration-delivery.md
 */

export const SCE_DS2_07A_PACKAGE_KEY = "SCE-DS2-07A" as const;

export const SCE_DS2_07A_PREDECESSOR = "SCE-DS2-CLEANUP-01" as const;

export const SCE_DS2_07A_SUCCESSOR = "SCE-DS2-07B" as const;

/** Authenticated discovery baseline from DS2-06R2 — do not expand in this package. */
export const SCE_DS2_07A_ROUTE_DISCOVERY_BASELINE = 233 as const;

/**
 * User-visible pages migrated to canonical workspace chrome in this package.
 * Redirect aliases are listed separately and are not visual migrations.
 */
export const SCE_DS2_07A_RENDERABLE_ROUTES = [
  "/dashboard/persons/[id]/edit",
  "/dashboard/persons/new",
  "/dashboard/teams/register",
  "/dashboard/vereine/new",
] as const;

/** Bookmark/deep-link aliases that immediately redirect — not visual surfaces. */
export const SCE_DS2_07A_REDIRECT_ALIASES = [
  {
    route: "/dashboard/finance/income_statement",
    destination: "/dashboard/finance/reports",
  },
  {
    route: "/dashboard/teams/new",
    destination: "/dashboard/teams/register",
  },
] as const;

/** Destination of the income_statement alias; already canonical before DS2-07A. */
export const SCE_DS2_07A_PREEXISTING_CANONICAL_DESTINATIONS = [
  "/dashboard/finance/reports",
] as const;

export const SCE_DS2_07A_SHARED_COMPONENT_CHANGES = [
  "components/ui/patterns/FormPagePattern.tsx — SceWorkspaceChrome composition",
  "scripts/sce-ds2-06-route-inventory-scan.mjs — FormPagePattern canonical marker; redirect aliases ignored for visual chrome",
] as const;
