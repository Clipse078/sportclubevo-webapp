/**
 * SCE-DS2-07B — route lifecycle governance.
 * Architecture adoption and visual verification are separate fields.
 * @see docs/design-system-v2/21-ds2-07b-route-lifecycle-governance.md
 */

export const SCE_DS2_07B_PACKAGE_KEY = "SCE-DS2-07B" as const;

export const SCE_DS2_07B_PREDECESSOR = "SCE-DS2-07A" as const;

export const SCE_DS2_07B_MIGRATION_PACKAGES = [
  "DS2-07C",
  "DS2-07D",
  "DS2-07E",
  "DS2-07F",
  "DS2-07G",
] as const;

export type SceDs207bMigrationPackage = (typeof SCE_DS2_07B_MIGRATION_PACKAGES)[number];

export const SCE_DS2_07B_MIGRATION_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "VERIFIED",
  "EXCEPTION",
] as const;

export type SceDs207bMigrationStatus = (typeof SCE_DS2_07B_MIGRATION_STATUSES)[number];

export const SCE_DS2_07B_ARCHITECTURES = [
  "CANONICAL",
  "PARTIAL",
  "LEGACY",
  "NOT_APPLICABLE",
] as const;

export type SceDs207bArchitecture = (typeof SCE_DS2_07B_ARCHITECTURES)[number];

export type SceDs207bVerificationStatus = "PENDING" | "VERIFIED" | "NOT_APPLICABLE";

export type SceDs207bVerificationEvidence = {
  visual: string | null;
  accessibility: string | null;
  functional: string | null;
  responsive: string | null;
};

export type SceDs207bRegistryEntry = {
  urlPattern: string;
  routeKey: string;
  sourceFile: string;
  inheritedLayouts: string[];
  module: string;
  authenticationScope: "AUTHENTICATED" | "PUBLIC";
  routeKind: "RENDERABLE_PAGE" | "REDIRECT_ALIAS";
  intercept: boolean;
  parallelSlot: string | null;
  architecture: SceDs207bArchitecture;
  migrationStatus: SceDs207bMigrationStatus;
  migrationPackage: SceDs207bMigrationPackage | null;
  priority: "Critical" | "High" | "Medium" | "Low";
  visualVerificationStatus: SceDs207bVerificationStatus;
  accessibilityVerificationStatus: SceDs207bVerificationStatus;
  functionalVerificationStatus: SceDs207bVerificationStatus;
  exceptionId: string | null;
  exceptionRationale: string | null;
  redirectDestination: string | null;
  introducedAfterBaseline: boolean;
  verificationEvidence: SceDs207bVerificationEvidence;
};

/**
 * Approved exception classes. Authenticated workspace pages are not eligible
 * for these ids unless the record documents a narrower overlay rationale.
 */
export const SCE_DS2_07B_EXCEPTION_IDS = {
  REDIRECT: "SCE-DS2-07B-EX-REDIRECT",
  PUBLIC: "SCE-DS2-07B-EX-PUBLIC",
  PREVIEW: "SCE-DS2-07B-EX-PREVIEW",
  PRINT: "SCE-DS2-07B-EX-PRINT",
} as const;

export const SCE_DS2_07B_PACKAGE_OWNERSHIP = {
  "DS2-07C": "Admin and configuration",
  "DS2-07D": "Communication and website CMS",
  "DS2-07E": "Planning, matches, training, tournaments and events",
  "DS2-07F": "Vereinsleitung and remaining workspaces",
  "DS2-07G": "Authenticated visual/accessibility verification and closure",
} as const;

export type SceDs207bSummary = {
  pageCount: number;
  authenticatedRenderableCount: number;
  authenticatedVisualCount: number;
  authenticatedRedirectCount: number;
  publicRenderableCount: number;
  publicRedirectCount: number;
  routeHandlerCount: number;
  frameworkFileCount: number;
  architecture: Record<SceDs207bArchitecture, number>;
  migrationStatus: Record<SceDs207bMigrationStatus, number>;
  verifiedAuthenticatedVisualCount: number;
  verifiedAuthenticatedVisualPercent: number;
  architecturalCanonicalCount: number;
  architecturalCanonicalPercent: number;
  unassignedCount: number;
  exceptionsById: Record<string, number>;
  outstandingByPackage: Record<SceDs207bMigrationPackage, number>;
  introducedAfterBaselineCount: number;
  blockingCount: number;
  trackedDebtCount: number;
};
