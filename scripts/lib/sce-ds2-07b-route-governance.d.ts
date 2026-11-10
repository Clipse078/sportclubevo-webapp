export const MIGRATION_PACKAGES: readonly string[];

export const EXCEPTION_IDS: {
  REDIRECT: string;
  PUBLIC: string;
  PREVIEW: string;
  PRINT: string;
};

export type GovernancePage = {
  sourceFile: string;
  urlPattern: string;
  routeKey: string;
  intercept: boolean;
  parallelSlot: string | null;
  routeKind: "RENDERABLE_PAGE" | "REDIRECT_ALIAS";
  authenticationScope: "AUTHENTICATED" | "PUBLIC";
  redirectDestination: string | null;
  module: string;
  pageSource: string;
  inheritedLayouts: string[];
  layoutSources: string[];
};

export type NonPageEntry = {
  kind: "ROUTE_HANDLER" | "FRAMEWORK_FILE";
  sourceFile: string;
  urlPattern: string;
  audience: string;
};

export type GovernanceDiscovery = {
  pages: GovernancePage[];
  nonPages: NonPageEntry[];
};

export type VerificationEvidence = {
  visual: string | null;
  accessibility: string | null;
  functional: string | null;
  responsive: string | null;
};

export type RegistryEntry = {
  urlPattern: string;
  routeKey: string;
  sourceFile: string;
  inheritedLayouts: string[];
  module: string;
  authenticationScope: "AUTHENTICATED" | "PUBLIC";
  routeKind: "RENDERABLE_PAGE" | "REDIRECT_ALIAS";
  intercept: boolean;
  parallelSlot: string | null;
  architecture: "CANONICAL" | "PARTIAL" | "LEGACY" | "NOT_APPLICABLE";
  migrationStatus: "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED" | "VERIFIED" | "EXCEPTION";
  migrationPackage: "DS2-07C" | "DS2-07D" | "DS2-07E" | "DS2-07F" | "DS2-07G" | null;
  priority: "Critical" | "High" | "Medium" | "Low";
  visualVerificationStatus: "PENDING" | "VERIFIED" | "NOT_APPLICABLE";
  accessibilityVerificationStatus: "PENDING" | "VERIFIED" | "NOT_APPLICABLE";
  functionalVerificationStatus: "PENDING" | "VERIFIED" | "NOT_APPLICABLE";
  exceptionId: string | null;
  exceptionRationale: string | null;
  redirectDestination: string | null;
  introducedAfterBaseline: boolean;
  verificationEvidence: VerificationEvidence;
};

export type LifecycleEvent = {
  sourceFile: string;
  change: string;
  rationale?: string;
  destinationSource?: string;
  urlPattern?: string | null;
};

export type GovernanceOverlay = {
  lifecycle?: LifecycleEvent[];
  recordOverrides?: Record<string, Partial<RegistryEntry>>;
};

export type GovernanceViolation = {
  code: string;
  sourceFile: string | null;
  urlPattern: string | null;
  message: string;
  migrationPackage?: string | null;
  architecture?: string;
};

export function discoverAppRouter(root: string): GovernanceDiscovery;

export function buildRegistry(input: {
  discovery: GovernanceDiscovery;
  baselineSourceFiles?: string[];
  overlay?: GovernanceOverlay;
}): RegistryEntry[];

export function evaluateGovernance(input: {
  discovery: GovernanceDiscovery;
  registry: RegistryEntry[];
  baselineSourceFiles?: string[];
  lifecycle?: LifecycleEvent[];
  overlay?: GovernanceOverlay;
}): {
  blocking: GovernanceViolation[];
  tracked: GovernanceViolation[];
};

export function evidenceAcceptable(value: unknown): boolean;

export function isVerifiedAuthenticatedVisual(entry: RegistryEntry | null | undefined): boolean;

export function assessNewPageContract(page: Partial<GovernancePage> | undefined): {
  architecture: boolean;
  typography: boolean;
  tokens: boolean;
};

export function evaluateRepository(root: string): {
  drift: string[];
  evaluation: { blocking: GovernanceViolation[]; tracked: GovernanceViolation[] };
  summary: {
    pageCount: number;
    authenticatedRenderableCount: number;
    authenticatedVisualCount: number;
    authenticatedRedirectCount: number;
    publicRenderableCount: number;
    publicRedirectCount: number;
    blockingCount: number;
    trackedDebtCount: number;
    unassignedCount: number;
    verifiedAuthenticatedVisualCount: number;
    verifiedAuthenticatedVisualPercent: number;
    architecturalCanonicalCount: number;
    architecturalCanonicalPercent: number;
    introducedAfterBaselineCount: number;
    architecture: { CANONICAL: number; PARTIAL: number; LEGACY: number; NOT_APPLICABLE: number };
    outstandingByPackage: Record<string, number>;
  };
};
