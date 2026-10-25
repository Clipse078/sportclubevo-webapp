import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import type { FinanceForecastTimingCoverage } from "@/lib/finance/forecast/finance-forecast-timing-read-model";
import type { FinanceForecastTimingWorkspacePresentationContext } from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";
import type { FinanceManagementOverviewReadModel } from "@/lib/finance/reporting/finance-management-overview-read-model";
import type { FinanceVarianceDriver } from "@/lib/finance/reporting/reporting-contribution-analysis";
import type { VarianceFavorability } from "@/lib/finance/actual/variance-semantics";

/** Restrained driver density on Übersicht (detailed exploration → Berichte). */
export const FINANCE_OVERVIEW_MAX_DRIVERS_PER_SIDE = 3 as const;

export const FINANCE_OVERVIEW_CONCLUSION_KINDS = [
  "ON_TRACK",
  "ABOVE_BUDGET_EXPECTED",
  "BELOW_BUDGET_EXPECTED",
  "FORECAST_UNAVAILABLE",
  "BUDGET_UNAVAILABLE",
  "NO_CONCLUSION",
] as const;

export type FinanceOverviewConclusionKind =
  (typeof FINANCE_OVERVIEW_CONCLUSION_KINDS)[number];

export type FinanceOverviewFinancialConclusion = {
  kind: FinanceOverviewConclusionKind;
  /** Primary on-track comparison: current forecast vs approved budget management result. */
  forecastVsBudgetFavorability: VarianceFavorability | null;
  forecastResultMinor: number | null;
  approvedBudgetResultMinor: number | null;
  forecastVsBudgetVarianceMinor: number | null;
};

export const FINANCE_OVERVIEW_ATTENTION_KINDS = [
  "MISSING_APPROVED_BUDGET",
  "MISSING_CURRENT_FORECAST",
  "UNFAVORABLE_FORECAST_VS_BUDGET",
  "TIMING_OVERALLOCATED",
  "TIMING_AMBIGUOUS_AT_CUTOFF",
  "SIGNIFICANT_UNTIMED_REMAINDER",
  "NO_REPORTING_STRUCTURE",
] as const;

export type FinanceOverviewAttentionKind =
  (typeof FINANCE_OVERVIEW_ATTENTION_KINDS)[number];

export type FinanceOverviewAttentionItem = {
  kind: FinanceOverviewAttentionKind;
  priority: number;
  routeKey:
    | "budget"
    | "forecast"
    | "reports"
    | "timing"
    | "structure"
    | null;
};

export type FinanceOverviewExpectedMovementAvailability =
  | "NOT_VISIBLE"
  | "NO_CURRENT_FORECAST"
  | "NO_REMAINING_EXPECTATION"
  | "ZERO_TIMING"
  | "PARTIAL_OR_FULL_TIMING";

export type FinanceOverviewExpectedMovementSection = {
  availability: FinanceOverviewExpectedMovementAvailability;
  presentationState: FinanceForecastTimingWorkspacePresentationContext | null;
  timingCoverage: FinanceForecastTimingCoverage | null;
  untimedRemainderMinor: number | null;
  visualModel: FinanceForecastTimingVisualModel | null;
};

export type FinanceOverviewDecisionIntelligenceReadModel = {
  management: FinanceManagementOverviewReadModel;
  conclusion: FinanceOverviewFinancialConclusion;
  drivers: {
    favourable: FinanceVarianceDriver[];
    unfavourable: FinanceVarianceDriver[];
    maxPerSide: typeof FINANCE_OVERVIEW_MAX_DRIVERS_PER_SIDE;
  };
  attentionItems: FinanceOverviewAttentionItem[];
  expectedMovement: FinanceOverviewExpectedMovementSection;
  capabilities: {
    canOpenReports: boolean;
    canOpenBudget: boolean;
    canOpenForecast: boolean;
    canOpenTiming: boolean;
    canOpenActuals: boolean;
    canOpenStructure: boolean;
  };
};
