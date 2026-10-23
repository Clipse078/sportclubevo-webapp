import type { ProjectionDataSufficiencyReason } from "@/lib/finance/projection/projection-architecture-contract";
import type {
  ProjectionDataSufficiencyAssessment,
  ProjectionEvidenceMaterial,
  ProjectionFinanceYearActualSeries,
  ProjectionPeriodActualObservation,
} from "@/lib/finance/projection/projection-evidence-types";

/**
 * General (methodology-agnostic) sufficiency thresholds for FIN-04B-03.
 * FIN-04B-04 may add methodology-specific eligibility on top.
 */
export const PROJECTION_GENERAL_SUFFICIENCY_THRESHOLDS = {
  /** Completed periods (current + historical) needed for SUFFICIENT readiness. */
  minCompletePeriodsForSufficient: 4,
  /** Prior finance years with any actual observation for SUFFICIENT. */
  minHistoricalFinanceYearsForSufficient: 1,
  /** Completed current-year periods alone cannot reach SUFFICIENT without history. */
  minCurrentYearCompletePeriodsForLimited: 1,
} as const;

function countObservationsWithEvidence(
  observations: readonly ProjectionPeriodActualObservation[],
): number {
  return observations.filter((o) => o.amountMinor !== null).length;
}

function countCompletePeriods(
  observations: readonly ProjectionPeriodActualObservation[],
): number {
  return observations.filter((o) => o.completeness === "COMPLETE" && o.amountMinor !== null).length;
}

function seriesHasAnyActualEvidence(series: ProjectionFinanceYearActualSeries): boolean {
  return series.observations.some((o) => o.amountMinor !== null);
}

function comparableRelativePeriodCount(
  current: ProjectionFinanceYearActualSeries,
  historical: readonly ProjectionFinanceYearActualSeries[],
): number {
  const currentCompleteIndexes = new Set(
    current.observations
      .filter((o) => o.completeness === "COMPLETE" && o.amountMinor !== null)
      .map((o) => o.relativePeriodIndex),
  );
  if (currentCompleteIndexes.size === 0) return 0;

  let count = 0;
  for (const hist of historical) {
    for (const obs of hist.observations) {
      if (
        obs.completeness === "COMPLETE" &&
        obs.amountMinor !== null &&
        currentCompleteIndexes.has(obs.relativePeriodIndex)
      ) {
        count += 1;
      }
    }
  }
  return count;
}

function buildMetrics(material: ProjectionEvidenceMaterial): ProjectionDataSufficiencyAssessment["metrics"] {
  const currentObs = material.currentYearActuals.observations;
  const historicalWithEvidence = material.historicalActuals.filter(seriesHasAnyActualEvidence);

  let historicalObservationCount = 0;
  let historicalCompletePeriodCount = 0;
  for (const series of material.historicalActuals) {
    historicalObservationCount += countObservationsWithEvidence(series.observations);
    historicalCompletePeriodCount += countCompletePeriods(series.observations);
  }

  const allEntriesDates = [
    ...material.currentYearActuals.observations,
    ...material.historicalActuals.flatMap((s) => s.observations),
  ]
    .filter((o) => o.amountMinor !== null)
    .map((o) => o.periodEndDate)
    .sort();

  return {
    currentYearObservationCount: countObservationsWithEvidence(currentObs),
    currentYearCompletePeriodCount: countCompletePeriods(currentObs),
    historicalFinanceYearCount: historicalWithEvidence.length,
    historicalObservationCount,
    historicalCompletePeriodCount,
    comparableRelativePeriodCount: comparableRelativePeriodCount(
      material.currentYearActuals,
      material.historicalActuals,
    ),
    latestActualDate: allEntriesDates.length > 0 ? allEntriesDates[allEntriesDates.length - 1]! : null,
    cutoffRelativePeriodIndex: null,
    hasBudgetContext: material.budgetContext !== null,
    hasCurrentForecastContext: material.forecastContext !== null,
  };
}

export function assessProjectionDataSufficiency(
  material: ProjectionEvidenceMaterial,
  options?: { targetAccountArchived?: boolean },
): ProjectionDataSufficiencyAssessment {
  const metrics = buildMetrics(material);
  const reasonCodes: ProjectionDataSufficiencyReason[] = [];

  if (options?.targetAccountArchived) {
    reasonCodes.push("ACCOUNT_ARCHIVED");
    return { level: "INSUFFICIENT", reasonCodes, metrics };
  }

  const totalActualObservations =
    metrics.currentYearObservationCount + metrics.historicalObservationCount;
  const totalCompletePeriods =
    metrics.currentYearCompletePeriodCount + metrics.historicalCompletePeriodCount;

  if (totalActualObservations === 0) {
    reasonCodes.push("NO_ACTUAL_HISTORY");
    if (metrics.currentYearObservationCount === 0) {
      reasonCodes.push("NO_CURRENT_YEAR_ACTUALS");
    }
    return { level: "INSUFFICIENT", reasonCodes, metrics };
  }

  if (metrics.currentYearObservationCount === 0) {
    reasonCodes.push("NO_CURRENT_YEAR_ACTUALS");
  }

  if (
    metrics.historicalFinanceYearCount <
      PROJECTION_GENERAL_SUFFICIENCY_THRESHOLDS.minHistoricalFinanceYearsForSufficient ||
    totalCompletePeriods < PROJECTION_GENERAL_SUFFICIENCY_THRESHOLDS.minCompletePeriodsForSufficient
  ) {
    if (totalCompletePeriods < 2) {
      reasonCodes.push("TOO_FEW_OBSERVATIONS");
    }
    if (metrics.historicalFinanceYearCount === 0) {
      reasonCodes.push("SPARSE_ACCOUNT_HISTORY");
    }
    return { level: "LIMITED", reasonCodes, metrics };
  }

  if (metrics.comparableRelativePeriodCount === 0) {
    reasonCodes.push("SPARSE_ACCOUNT_HISTORY");
    return { level: "LIMITED", reasonCodes, metrics };
  }

  return { level: "SUFFICIENT", reasonCodes, metrics };
}
