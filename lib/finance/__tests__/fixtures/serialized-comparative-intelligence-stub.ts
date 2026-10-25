import type { SerializedFinanceComparativeIntelligenceReadModel } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import {
  buildComparativeComparisonAvailabilityMatrix,
  FINANCE_COMPARATIVE_COMPARISON_KINDS,
} from "@/lib/finance/reporting/comparative-comparison-availability";

const emptySlice = {
  availability: "BOTH_MISSING" as const,
  baselineMinor: null,
  comparisonMinor: null,
  rawDeltaMinor: null,
  variancePercent: null,
  favorability: null,
  absoluteVarianceMagnitudeMinor: null,
};

export function serializedComparativeIntelligenceStub(
  overrides: Partial<SerializedFinanceComparativeIntelligenceReadModel> = {},
): SerializedFinanceComparativeIntelligenceReadModel {
  const actualGrain = overrides.actualContext?.grain ?? ("ANNUAL_FULL_YEAR" as const);
  const matrix =
    overrides.comparisonAvailability ??
    buildComparativeComparisonAvailabilityMatrix({ actualGrain });

  return {
    overallComparison: {
      pair: "CURRENT_FORECAST_VS_APPROVED_BUDGET",
      presentationRole: "SUPPORTED",
      baseline: { availability: "AVAILABLE", amountMinor: 60_00 },
      comparison: { availability: "AVAILABLE", amountMinor: 65_00 },
      variance: {
        ...emptySlice,
        availability: "AVAILABLE",
        rawDeltaMinor: 5_00,
        favorability: "FAVORABLE",
      },
    },
    actualContext: {
      grain: actualGrain,
      cutoffDate: null,
      measure: { availability: "AVAILABLE", amountMinor: 55_00 },
      presentationRole: actualGrain === "YTD" ? "CONTEXT_ONLY" : "SUPPORTED",
      grainExplanationKey: actualGrain === "YTD" ? "YTD_ACTUAL_VS_ANNUAL_PLAN" : null,
    },
    actualVsBudgetVarianceRole: actualGrain === "YTD" ? "UNSUPPORTED" : "SUPPORTED",
    comparisonAvailability: matrix,
    materialDrivers: { favourable: [], unfavourable: [] },
    attentionSignals: [],
    sourceAvailability: {
      approvedBudget: "AVAILABLE",
      actual: "AVAILABLE",
      currentForecast: "AVAILABLE",
    },
    ...overrides,
    comparisonAvailability: overrides.comparisonAvailability ?? matrix,
  };
}

export { FINANCE_COMPARATIVE_COMPARISON_KINDS };
