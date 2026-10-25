import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";
import type { FinanceVarianceDriver } from "@/lib/finance/reporting/reporting-contribution-analysis";
import type {
  FinanceComparativeComparisonAvailabilityEntry,
  FinanceComparativeGrainExplanationKey,
  FinanceComparativePresentationRole,
} from "@/lib/finance/reporting/comparative-comparison-availability";
import type { FinanceManagementMeasureAvailability } from "@/lib/finance/reporting/finance-management-overview-read-model";
import type { ManagementPnlMeasureCell } from "@/lib/finance/reporting/finance-management-pnl-read-model";

export type FinanceComparativeAttentionSignalKind =
  | "FORECAST_EXPECTED_ABOVE_BUDGET"
  | "FORECAST_EXPECTED_BELOW_BUDGET"
  | "FORECAST_ON_BUDGET"
  | "MATERIAL_FAVORABLE_VARIANCE_DRIVERS"
  | "MATERIAL_UNFAVORABLE_VARIANCE_DRIVERS"
  | "RECORDED_ACTUAL_EVIDENCE"
  | "LIMITED_ACTUAL_EVIDENCE"
  | "MISSING_APPROVED_BUDGET"
  | "MISSING_CURRENT_FORECAST";

export type FinanceComparativeAttentionSignal = {
  kind: FinanceComparativeAttentionSignalKind;
  priority: number;
};

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
  attentionSignals: FinanceComparativeAttentionSignal[];
  sourceAvailability: {
    approvedBudget: FinanceManagementMeasureAvailability;
    actual: FinanceManagementMeasureAvailability;
    currentForecast: FinanceManagementMeasureAvailability;
  };
};
