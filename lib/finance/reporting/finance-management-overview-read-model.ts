import type { CanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";
import type { FinanceVarianceDriver } from "@/lib/finance/reporting/reporting-contribution-analysis";
import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";

export type FinanceManagementMeasureAvailability =
  | "AVAILABLE"
  | "NO_APPROVED_BUDGET"
  | "NO_ACTUAL"
  | "NO_CURRENT_FORECAST"
  | "NOT_VISIBLE";

export type FinanceManagementOverviewReadModel = {
  tenantId: string;
  financeYearId: string;
  financeYearName: string;
  mode: "LIVE";
  baseCurrency: string | null;
  availability:
    | "AVAILABLE"
    | "NO_BASE_CURRENCY"
    | "NO_FINANCE_YEAR"
    | "NO_STRUCTURE"
    | "PARTIAL_SOURCE_AVAILABILITY";
  actualCutoffDate: Date | null;
  approvedBudget: {
    availability: FinanceManagementMeasureAvailability;
    summary: CanonicalFinancialResult | null;
    approvedBudgetVersionId: string | null;
  };
  actual: {
    availability: FinanceManagementMeasureAvailability;
    summary: CanonicalFinancialResult | null;
    grain: "ANNUAL_FULL_YEAR" | "YTD" | null;
  };
  currentForecast: {
    availability: FinanceManagementMeasureAvailability;
    summary: CanonicalFinancialResult | null;
    currentForecastVersionId: string | null;
  };
  forecastVsBudgetVariance: FinanceReportingComparisonSlice;
  actualVsBudgetVariance: FinanceReportingComparisonSlice;
  topUnfavourableDrivers: FinanceVarianceDriver[];
  topFavourableDrivers: FinanceVarianceDriver[];
  attention: {
    hasUnfavourableManagementResultVariance: boolean;
    hasMissingApprovedBudget: boolean;
    hasMissingCurrentForecast: boolean;
  };
};
