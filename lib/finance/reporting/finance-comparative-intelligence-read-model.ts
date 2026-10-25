import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";
import type { FinanceVarianceDriver } from "@/lib/finance/reporting/reporting-contribution-analysis";
import type {
  FinanceComparativeComparisonAvailabilityEntry,
  FinanceComparativeGrainExplanationKey,
  FinanceComparativePresentationRole,
} from "@/lib/finance/reporting/comparative-comparison-availability";
import type { FinanceManagementMeasureAvailability } from "@/lib/finance/reporting/finance-management-overview-read-model";
import type { ManagementPnlMeasureCell } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import type { VarianceFavorability } from "@/lib/finance/actual/variance-semantics";

export type FinanceComparativeAttentionDriverRef = Pick<
  FinanceVarianceDriver,
  "kind" | "id" | "name" | "canonicalSemantic" | "comparison"
>;

export type FinanceComparativeAttentionInsight =
  | {
      kind: "OVERALL_RESULT";
      favorability: VarianceFavorability;
      rawDeltaMinor: number | null;
    }
  | {
      kind: "FAVORABLE_DRIVER";
      driver: FinanceComparativeAttentionDriverRef;
    }
  | {
      kind: "UNFAVORABLE_DRIVER";
      driver: FinanceComparativeAttentionDriverRef;
    }
  | { kind: "MISSING_APPROVED_BUDGET" }
  | { kind: "MISSING_CURRENT_FORECAST" };

export type FinanceComparativeActualContext = {
  grain: "ANNUAL_FULL_YEAR" | "YTD" | null;
  cutoffDate: Date | null;
  measure: ManagementPnlMeasureCell;
  /** Actual is shown as progress evidence when annual plan comparisons are primary. */
  presentationRole: FinanceComparativePresentationRole;
  grainExplanationKey: FinanceComparativeGrainExplanationKey | null;
};

export type FinanceComparativeOverallComparison = {
  pair: "CURRENT_FORECAST_VS_APPROVED_BUDGET";
  presentationRole: "SUPPORTED";
  baseline: ManagementPnlMeasureCell;
  comparison: ManagementPnlMeasureCell;
  variance: FinanceReportingComparisonSlice;
};

export type FinanceComparativeIntelligenceReadModel = {
  overallComparison: FinanceComparativeOverallComparison;
  actualContext: FinanceComparativeActualContext;
  actualVsBudgetVarianceRole: FinanceComparativePresentationRole;
  comparisonAvailability: FinanceComparativeComparisonAvailabilityEntry[];
  materialDrivers: {
    favourable: FinanceVarianceDriver[];
    unfavourable: FinanceVarianceDriver[];
  };
  /** Bounded decision-oriented insights for tenant-facing Reporting (max 3). */
  attentionInsights: FinanceComparativeAttentionInsight[];
  sourceAvailability: {
    approvedBudget: FinanceManagementMeasureAvailability;
    actual: FinanceManagementMeasureAvailability;
    currentForecast: FinanceManagementMeasureAvailability;
  };
};
