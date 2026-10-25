import type { CanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";
import type { FinanceVarianceDriver } from "@/lib/finance/reporting/reporting-contribution-analysis";
import type {
  FinanceReportingComparisonGrain,
  FinanceReportingComparisonPair,
  FinanceReportingComparisonSlice,
} from "@/lib/finance/reporting/reporting-comparison-model";
import type { VarianceReportingTreeNode } from "@/lib/finance/reporting/build-variance-reporting-tree";

export type FinanceVarianceAnalysisReadModel = {
  tenantId: string;
  financeYearId: string;
  financeYearName: string;
  mode: "LIVE";
  comparison: FinanceReportingComparisonPair;
  grain: FinanceReportingComparisonGrain;
  baseCurrency: string | null;
  availability:
    | "AVAILABLE"
    | "NO_BASE_CURRENCY"
    | "NO_FINANCE_YEAR"
    | "NO_STRUCTURE"
    | "NO_APPROVED_BUDGET"
    | "NO_ACTUAL"
    | "NO_CURRENT_FORECAST"
    | "PERIOD_MISMATCH"
    | "UNSUPPORTED"
    | "PARTIAL_SOURCE_AVAILABILITY";
  actualCutoffDate: Date | null;
  approvedBudgetVersionId: string | null;
  currentForecastVersionId: string | null;
  baselineSummary: CanonicalFinancialResult | null;
  comparisonSummary: CanonicalFinancialResult | null;
  managementResultComparison: FinanceReportingComparisonSlice;
  tree: VarianceReportingTreeNode[];
  topFavourableDrivers: FinanceVarianceDriver[];
  topUnfavourableDrivers: FinanceVarianceDriver[];
  sourceVisibility: {
    approvedBudget: boolean;
    actual: boolean;
    currentForecast: boolean;
  };
};
