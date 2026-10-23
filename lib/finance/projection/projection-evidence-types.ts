import type {
  ProjectionDataSufficiencyLevel,
  ProjectionDataSufficiencyReason,
  ProjectionEvidenceKind,
} from "@/lib/finance/projection/projection-architecture-contract";

/** Whether a finance-year-relative period has fully elapsed through the actuals cutoff. */
export type ProjectionObservationCompleteness = "COMPLETE" | "PARTIAL" | "NO_DATA";

/**
 * Methodology-facing monthly (finance-year-relative) actual observation.
 * `amountMinor` null = missing evidence (not zero).
 */
export type ProjectionPeriodActualObservation = {
  financeYearId: string;
  relativePeriodIndex: number;
  periodStartDate: string;
  periodEndDate: string;
  amountMinor: number | null;
  completeness: ProjectionObservationCompleteness;
  entryCount: number;
};

export type ProjectionFinanceYearActualSeries = {
  financeYearId: string;
  startDate: string;
  endDate: string;
  /** Display name is informational only — ordering uses dates. */
  financeYearName: string;
  observations: readonly ProjectionPeriodActualObservation[];
};

/** Governance baseline — context, not historical fact. */
export type ProjectionBudgetContextEvidence = {
  kind: "BUDGET_BASELINE";
  financeYearId: string;
  financialAccountId: string;
  budgetVersionId: string;
  amountMinor: number;
  currency: string;
};

/** Organisation current forecast — management expectation, not actual history. */
export type ProjectionForecastContextEvidence = {
  kind: "CURRENT_FORECAST";
  financeYearId: string;
  financialAccountId: string;
  forecastVersionId: string;
  amountMinor: number;
  currency: string;
};

export type ProjectionEvidenceSupportingMetrics = {
  currentYearObservationCount: number;
  currentYearCompletePeriodCount: number;
  historicalFinanceYearCount: number;
  historicalObservationCount: number;
  historicalCompletePeriodCount: number;
  comparableRelativePeriodCount: number;
  latestActualDate: string | null;
  cutoffRelativePeriodIndex: number | null;
  hasBudgetContext: boolean;
  hasCurrentForecastContext: boolean;
};

export type ProjectionDataSufficiencyAssessment = {
  level: ProjectionDataSufficiencyLevel;
  reasonCodes: readonly ProjectionDataSufficiencyReason[];
  metrics: ProjectionEvidenceSupportingMetrics;
};

export type ProjectionEvidenceMaterial = {
  tenantId: string;
  financeYearId: string;
  financialAccountId: string;
  currency: string;
  actualsThroughDate: string;
  currentYearActuals: ProjectionFinanceYearActualSeries;
  historicalActuals: readonly ProjectionFinanceYearActualSeries[];
  budgetContext: ProjectionBudgetContextEvidence | null;
  forecastContext: ProjectionForecastContextEvidence | null;
  evidenceKindsPresent: readonly ProjectionEvidenceKind[];
};

export type ProjectionEvidenceContext = ProjectionEvidenceMaterial & {
  sufficiency: ProjectionDataSufficiencyAssessment;
  evidenceFingerprint: string;
};

export type ProjectionEvidenceStaleness = "FRESH" | "STALE";
