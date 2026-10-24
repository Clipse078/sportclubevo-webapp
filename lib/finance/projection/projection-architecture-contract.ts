/**
 * SCE Finance FIN-04B — SCE Projection Engine architecture contract (pure types/constants).
 *
 * No Prisma, persistence, or calculation implementation in FIN-04B-01.
 * Canonical semantics for review before FIN-04B-02+ implementation.
 *
 * Principle: SCE generates the projection. The organisation owns the forecast.
 */

import { FINANCIAL_YEAR_CONFIGURABLE } from "@/lib/finance/finance-architecture";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";

/** Organisation-owned management expectation (FIN-04A). */
export const SCE_MEASURE_CURRENT_FORECAST = "CURRENT_FORECAST" as const;
/** System-generated expectation from tenant evidence (FIN-04B). */
export const SCE_MEASURE_SCE_PROJECTION = "SCE_PROJECTION" as const;
/** Governance baseline (FIN-02). */
export const SCE_MEASURE_APPROVED_BUDGET = "APPROVED_BUDGET" as const;
/** Factual measured outcomes (FIN-03). */
export const SCE_MEASURE_ACTUAL = "ACTUAL" as const;
/** Alternative what-if view (FIN-04D) — not projection, not current forecast. */
export const SCE_MEASURE_SCENARIO = "SCENARIO" as const;

export type SceFinancialExpectationMeasure =
  | typeof SCE_MEASURE_CURRENT_FORECAST
  | typeof SCE_MEASURE_SCE_PROJECTION
  | typeof SCE_MEASURE_APPROVED_BUDGET
  | typeof SCE_MEASURE_ACTUAL
  | typeof SCE_MEASURE_SCENARIO;

/** Durable architecture locks reviewed in FIN-04B-01. */
export const SCE_PROJECTION_ARCHITECTURE_LOCKS = {
  projectionDistinctFromCurrentForecast: true,
  projectionDistinctFromScenario: true,
  projectionNeverSilentlyOverwritesForecast: true,
  forecastNeverSilentlyOverwritesApprovedBudget: true,
  actualRemainsIndependentFromForecastAndProjection: true,
  numericalEngineNotLlm: true,
  llmMayAssistExplanationOnly: true,
  tenantEvidenceTenantIsolated: true,
  crossTenantEvidenceForbidden: true,
  sportAgnosticEvidenceModel: true,
  countryAgnosticEvidenceModel: true,
  noHardcodedCurrency: true,
  financeYearTenantDefined: FINANCIAL_YEAR_CONFIGURABLE,
  naiveYtdAnnualisationIsNotDefaultIntelligence: true,
  fabricatePrecisionWhenInsufficientData: false,
  fakeProjectionRangesWhenUnavailable: false,
  fakeMonthlyPublishedProjectionGrain: false,
  publishedProjectionPhasingSupported: FORECAST_PHASING_SUPPORTED,
  useForecastScenarioKeyForProjection: false,
  fxConversionInProjection: false,
} as const;

/**
 * Published management grain aligns with FIN-04A current forecast:
 * FinanceYear + FinancialAccount + annual amountMinor.
 */
export const PROJECTION_PUBLISHED_GRAIN = {
  financeYearScoped: true,
  financialAccountScoped: true,
  annualAmountMinor: true,
  monthlyForecastValuesInPublishedProjection: false,
} as const;

/**
 * Internal calculation may use finer time buckets (e.g. finance-year months from FIN-03B resolver)
 * before rolling up to annual published lines. Calculation grain ≠ published grain.
 */
export const PROJECTION_CALCULATION_GRAIN = {
  mayUseFinanceYearRelativeMonths: true,
  mayUseFinanceYearRelativeQuarters: true,
  mustRespectTenantFinanceYearBoundaries: true,
  assumesCalendarJanuaryDecember: false,
  assumesTwelveCalendarMonths: false,
} as const;

/** Extensible evidence classes — progressive enablement; not all exist in FIN-04B-01. */
export const PROJECTION_EVIDENCE_KINDS = [
  "HISTORICAL_ACTUALS",
  "CURRENT_YEAR_ACTUALS",
  "BUDGET_BASELINE",
  "CURRENT_FORECAST",
  "KNOWN_COMMITMENTS",
  "RECEIVABLES",
  "RECURRING_PATTERNS",
  "OPERATIONAL_DRIVERS",
  "MANUAL_ASSUMPTIONS",
] as const;

export type ProjectionEvidenceKind = (typeof PROJECTION_EVIDENCE_KINDS)[number];

/** Evidence available without FIN-07 / FIN-08 / driver modules (FIN-04B baseline). */
export const PROJECTION_EVIDENCE_AVAILABLE_FIN_04B_BASELINE: readonly ProjectionEvidenceKind[] =
  [
    "HISTORICAL_ACTUALS",
    "CURRENT_YEAR_ACTUALS",
    "BUDGET_BASELINE",
    "CURRENT_FORECAST",
  ] as const;

export const PROJECTION_DATA_SUFFICIENCY_LEVELS = [
  "SUFFICIENT",
  "LIMITED",
  "INSUFFICIENT",
] as const;

export type ProjectionDataSufficiencyLevel =
  (typeof PROJECTION_DATA_SUFFICIENCY_LEVELS)[number];

/** Machine-readable reasons — detection rules may grow over time. */
export const PROJECTION_DATA_SUFFICIENCY_REASONS = [
  "NO_ACTUAL_HISTORY",
  "TOO_FEW_OBSERVATIONS",
  "NO_CURRENT_YEAR_ACTUALS",
  "SPARSE_ACCOUNT_HISTORY",
  "UNSTABLE_HISTORY",
  "UNSUPPORTED_DATA_PATTERN",
  "ACCOUNT_ARCHIVED",
  "ACCOUNT_NEW_NO_HISTORY",
  "EVIDENCE_PROVIDER_UNAVAILABLE",
] as const;

export type ProjectionDataSufficiencyReason =
  (typeof PROJECTION_DATA_SUFFICIENCY_REASONS)[number];

/** Product-facing methodology families — not internal ML model names. */
export const PROJECTION_METHODOLOGY_FAMILIES = [
  "BASELINE_REFERENCE",
  "RUN_RATE",
  "HISTORICAL_PATTERN",
  "SEASONAL_PATTERN",
  "DRIVER_BASED",
  "STATISTICAL",
  "ENSEMBLE",
  /** Version-level aggregate when lines used different methodologies (FIN-04B-04). */
  "MIXED",
  "NONE",
] as const;

export type ProjectionMethodologyFamily =
  (typeof PROJECTION_METHODOLOGY_FAMILIES)[number];

/** Data sufficiency ≠ model confidence. */
export const PROJECTION_CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW", "NONE"] as const;

export type ProjectionConfidenceLevel = (typeof PROJECTION_CONFIDENCE_LEVELS)[number];

/**
 * Persistence model (FIN-04B-01 decision):
 * Hybrid — calculate on explicit generate/refresh; persist versioned snapshot for audit and apply workflow.
 * Not dynamically recalculated on every workspace read once a snapshot exists.
 */
export const PROJECTION_PERSISTENCE_MODEL = "VERSIONED_SNAPSHOT_HYBRID" as const;

/** UI / API lifecycle states for a finance year projection assist surface. */
export const PROJECTION_WORKSPACE_STATES = [
  "NO_PROJECTION_GENERATED",
  "PROJECTION_AVAILABLE",
  "PROJECTION_STALE",
  "INSUFFICIENT_DATA",
  "CALCULATION_FAILED",
] as const;

export type ProjectionWorkspaceState =
  (typeof PROJECTION_WORKSPACE_STATES)[number];

/** Staleness triggers (semantic contract; invalidation implementation deferred). */
export const PROJECTION_STALENESS_TRIGGERS = [
  "NEW_ACTUAL_ENTRY",
  "EDITED_ACTUAL_ENTRY",
  "DELETED_ACTUAL_ENTRY",
  "FINANCE_YEAR_BOUNDARY_CHANGED",
  "ACCOUNT_STRUCTURE_CHANGED",
  "RELEVANT_DRIVER_CHANGED",
  "PROJECTION_EVIDENCE_FINGERPRINT_CHANGED",
] as const;

/**
 * Explicit apply workflow — first implementation: whole FinanceYear projection → current forecast lines.
 * Per-account apply may follow canonical row-selection pattern later.
 */
export const PROJECTION_TO_FORECAST_APPLY_SCOPE = {
  firstImplementation: "WHOLE_FINANCE_YEAR",
  perAccountApplyLater: true,
  mutatesApprovedBudget: false,
  mutatesActuals: false,
  mutatesProjectionSnapshot: false,
  requiresExplicitUserAction: true,
  /** FIN-04B-02+ contract: adoption creates a new organisation forecast version (FIN-04B-06). */
  createsNewForecastVersion: true,
} as const;

/** Capability — reuse FORECASTING; projection is assist inside Prognose workspace. */
export const PROJECTION_CAPABILITY_KEY = "FORECASTING" as const;

/**
 * Permissions (no explosion): view shares forecast view; generate/refresh and apply require forecast manage.
 * Distinct actions remain in authorization layer even when permission keys overlap.
 */
export const PROJECTION_PERMISSION_CONTRACT = {
  view: "finance.forecast.view",
  generateOrRefresh: "finance.forecast.manage",
  applyToCurrentForecast: "finance.forecast.manage",
  adminImplied: "finance.admin",
} as const;

/**
 * German product terminology (localization anchor — not core enum labels).
 * Internal domain remains "projection"; tenant-facing label is Automatische Prognose.
 */
export const PROJECTION_GERMAN_PRODUCT_TERMS = {
  currentForecast: "Aktuelle Prognose",
  automaticForecast: "Automatische Prognose",
  applyAction: "Automatische Prognose übernehmen",
  workspaceTab: "Prognose",
} as const;

/** Future driver modules register through this boundary — finance core stays agnostic. */
export type ProjectionDriverEvidenceProvider = {
  readonly providerKey: string;
  readonly evidenceKinds: readonly ProjectionEvidenceKind[];
  /** Tenant-scoped fetch; must not read other tenants. */
  fetchEvidence(input: {
    tenantId: string;
    financeYearId: string;
    financialAccountId?: string;
  }): Promise<unknown>;
};

/** Canonical cutoff for audit — inclusive UTC calendar day of latest actual considered. */
export type ProjectionSourceCutoff = {
  actualsThroughDate: string;
  financeYearId: string;
};

/** Optional range — absence is valid. */
export type ProjectionAmountRange = {
  lowerBoundMinor: number | null;
  projectedAmountMinor: number | null;
  upperBoundMinor: number | null;
  currency: string;
};

/** Calculation response / persisted snapshot shared semantics (implementation FIN-04B-02+). */
export type SceProjectionLineResult = {
  financialAccountId: string;
  projectedAmountMinor: number | null;
  currency: string;
  dataSufficiency: ProjectionDataSufficiencyLevel;
  sufficiencyReasons: readonly ProjectionDataSufficiencyReason[];
  methodologyFamily: ProjectionMethodologyFamily;
  confidenceLevel: ProjectionConfidenceLevel;
  range: ProjectionAmountRange | null;
  sourceCutoff: ProjectionSourceCutoff;
  evidenceKindsConsidered: readonly ProjectionEvidenceKind[];
};

/** Structured explainability — prefer over prose-only storage. */
export type SceProjectionExplainability = {
  evidenceKinds: readonly ProjectionEvidenceKind[];
  sourceCutoff: ProjectionSourceCutoff;
  methodologyFamily: ProjectionMethodologyFamily;
  methodologyVersion: string | null;
  dataSufficiency: ProjectionDataSufficiencyLevel;
  sufficiencyReasons: readonly ProjectionDataSufficiencyReason[];
  confidenceLevel: ProjectionConfidenceLevel;
  confidenceRationaleCodes: readonly string[];
  materialInfluences: readonly { code: string; weight: number | null }[];
};

/** Forecast adoption audit (persisted in FIN-04B-02; workflow in FIN-04B-06). */
export type ProjectionForecastAdoptionProvenance = {
  projectionVersionId: string;
  appliedAt: string;
  appliedByUserId: string;
  /** Forecast version superseded when adoption completes (nullable until apply). */
  sourceForecastVersionId: string | null;
  /** New CURRENT forecast version created by adoption. */
  targetForecastVersionId: string;
  applyScope: "WHOLE_FINANCE_YEAR" | "SELECTED_ACCOUNTS";
};
