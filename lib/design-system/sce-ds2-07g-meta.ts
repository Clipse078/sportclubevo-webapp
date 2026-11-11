/**
 * SCE-DS2-07G — authenticated visual, accessibility and functional verification.
 * @see docs/design-system-v2/26-ds2-07g-visual-functional-verification-delivery.md
 */

export const SCE_DS2_07G_PACKAGE_KEY = "SCE-DS2-07G" as const;

export const SCE_DS2_07G_PREDECESSOR = "SCE-DS2-07F" as const;

export const SCE_DS2_07G_VIEWPORTS = {
  desktop: { width: 1440, label: "desktop-1440" },
  compactDesktop: { width: 1093, label: "compact-desktop-1093" },
  tablet: { width: 768, label: "tablet-768" },
  mobile: { width: 390, label: "mobile-390" },
} as const;

export type SceDs207gVerificationChannelStatus =
  | "PENDING"
  | "VERIFIED"
  | "BLOCKED"
  | "NOT_APPLICABLE";

/** Independent verification dimension status (batch-3 evidence contract). */
export type SceDs207gDimensionStatus =
  | "PASS"
  | "FAIL"
  | "PENDING"
  | "BLOCKED"
  | "NOT_APPLICABLE";

export type SceDs207gDimensionResult = {
  status: SceDs207gDimensionStatus;
  reason?: string;
  details?: string[];
};

export type SceDs207gRouteDimensionEvidence = {
  authentication: SceDs207gDimensionResult;
  visual: SceDs207gDimensionResult & { screenshotReviewed?: boolean };
  responsive: SceDs207gDimensionResult & {
    viewports?: Partial<
      Record<keyof typeof SCE_DS2_07G_VIEWPORTS, SceDs207gDimensionResult>
    >;
  };
  accessibility: SceDs207gDimensionResult & {
    axeViolations?: number;
    axeIncomplete?: number;
  };
  functional: SceDs207gDimensionResult;
  authorization: SceDs207gDimensionResult;
};

export const SCE_DS2_07G_EVIDENCE_CONTRACT_VERSION = "2026-11-11-batch-11" as const;

export type SceDs207gAutomatedChecksStatus = "PASSED" | "PENDING" | "FAILED";

export type SceDs207gArchitectureAdoptionStatus = "IMPLEMENTED" | "VERIFIED";

export type SceDs207gPageArchetype =
  | "workspace-hub"
  | "list"
  | "detail"
  | "form"
  | "planning-activity"
  | "future-module"
  | "intercept"
  | "mixed";

export type SceDs207gDefectRecord = {
  id: string;
  introducedByDs2: boolean | null;
  status: "OPEN" | "FIXED" | "TRACKED_DEBT";
  summary: string;
  reproduction: string | null;
};

export type SceDs207gVerificationMatrixEntry = {
  urlPattern: string;
  sourceFile: string;
  module: string;
  requiredPermissions: string[];
  testPersona: string;
  pageArchetype: SceDs207gPageArchetype;
  intercept: boolean;
  parallelSlot: string | null;
  architectureAdoption: SceDs207gArchitectureAdoptionStatus;
  automatedChecks: SceDs207gAutomatedChecksStatus;
  desktop: SceDs207gVerificationChannelStatus;
  compactDesktop: SceDs207gVerificationChannelStatus;
  tablet: SceDs207gVerificationChannelStatus;
  mobile: SceDs207gVerificationChannelStatus;
  accessibility: SceDs207gVerificationChannelStatus;
  functional: SceDs207gVerificationChannelStatus;
  authenticatedVisual: SceDs207gVerificationChannelStatus;
  evidenceReferences: string[];
  defects: SceDs207gDefectRecord[];
};

export type SceDs207gVerificationSummary = {
  matrixVersion: string;
  evidenceContractVersion?: string;
  generatedAt: string;
  totalCanonicalRoutes: number;
  verifiedAuthenticatedVisualCount: number;
  pendingAuthenticatedVisualCount: number;
  blockedCount: number;
  automatedChecksPassedCount: number;
  highRiskBatchSize: number;
  highRiskVerifiedCount: number;
  highRiskResponsiveVerifiedCount?: number;
  dimensionClosureCompleteCount?: number;
  dimensionAccessibilityPassCount?: number;
  dimensionFunctionalPassCount?: number;
  authenticatedBrowserAvailable: boolean;
  contrastSmokeDebt: string[];
  trackedBaselineDebt: string[];
};
