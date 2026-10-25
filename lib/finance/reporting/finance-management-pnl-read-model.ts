import type { CanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";
import type { FinanceVarianceDriver } from "@/lib/finance/reporting/reporting-contribution-analysis";
import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";
import type { PnlReconciliationSlice } from "@/lib/finance/reporting/pnl-reporting-completeness";
import type { FinanceManagementMeasureAvailability } from "@/lib/finance/reporting/finance-management-overview-read-model";

export type ManagementPnlMeasureCell = {
  availability: FinanceManagementMeasureAvailability;
  amountMinor: number | null;
};

export type ManagementPnlAccountRow = {
  kind: "account";
  accountId: string;
  name: string;
  reportingGroupId: string;
  sortOrder: number;
  lifecycle: "ACTIVE" | "ARCHIVED";
  archivedAt: Date | null;
  canonicalSemantic: "INCOME" | "EXPENSE";
  approvedBudget: ManagementPnlMeasureCell;
  actual: ManagementPnlMeasureCell;
  currentForecast: ManagementPnlMeasureCell;
  forecastVsBudget: FinanceReportingComparisonSlice;
};

export type ManagementPnlGroupRow = {
  kind: "reporting_group";
  groupId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  lifecycle: "ACTIVE" | "ARCHIVED";
  archivedAt: Date | null;
  approvedBudget: ManagementPnlMeasureCell;
  actual: ManagementPnlMeasureCell;
  currentForecast: ManagementPnlMeasureCell;
  forecastVsBudget: FinanceReportingComparisonSlice;
  children: ManagementPnlTreeNode[];
};

export type ManagementPnlUnassignedResidualRow = {
  kind: "unassigned_residual";
  residualGroupId: typeof import("@/lib/finance/reporting/pnl-reporting-completeness").FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID;
  canonicalSemantic: "INCOME" | "EXPENSE";
  approvedBudget: ManagementPnlMeasureCell;
  actual: ManagementPnlMeasureCell;
  currentForecast: ManagementPnlMeasureCell;
  forecastVsBudget: FinanceReportingComparisonSlice;
  accounts: ManagementPnlAccountRow[];
};

export type ManagementPnlTreeNode =
  | ManagementPnlGroupRow
  | ManagementPnlAccountRow
  | ManagementPnlUnassignedResidualRow;

export type ManagementPnlSemanticSection = {
  semantic: "INCOME" | "EXPENSE";
  sectionTotal: {
    approvedBudget: ManagementPnlMeasureCell;
    actual: ManagementPnlMeasureCell;
    currentForecast: ManagementPnlMeasureCell;
    forecastVsBudget: FinanceReportingComparisonSlice;
  };
  nodes: ManagementPnlTreeNode[];
};

export type FinanceManagementPnlReadModel = {
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
  actualGrain: "ANNUAL_FULL_YEAR" | "YTD" | null;
  sourceVisibility: {
    approvedBudget: boolean;
    actual: boolean;
    currentForecast: boolean;
  };
  approvedBudget: {
    availability: FinanceManagementMeasureAvailability;
    approvedBudgetVersionId: string | null;
  };
  actual: {
    availability: FinanceManagementMeasureAvailability;
    grain: "ANNUAL_FULL_YEAR" | "YTD" | null;
  };
  currentForecast: {
    availability: FinanceManagementMeasureAvailability;
    currentForecastVersionId: string | null;
  };
  actualVsBudgetVariance: FinanceReportingComparisonSlice;
  interpretation: {
    budgetedResult: CanonicalFinancialResult | null;
    expectedResult: CanonicalFinancialResult | null;
    forecastVsBudgetManagementResult: FinanceReportingComparisonSlice;
  };
  incomeSection: ManagementPnlSemanticSection;
  expenseSection: ManagementPnlSemanticSection;
  managementResult: {
    approvedBudget: ManagementPnlMeasureCell;
    actual: ManagementPnlMeasureCell;
    currentForecast: ManagementPnlMeasureCell;
    forecastVsBudget: FinanceReportingComparisonSlice;
  };
  topFavourableDrivers: FinanceVarianceDriver[];
  topUnfavourableDrivers: FinanceVarianceDriver[];
  reconciliation: {
    approvedBudget: PnlReconciliationSlice;
    actual: PnlReconciliationSlice;
    currentForecast: PnlReconciliationSlice;
  };
  hasUnassignedFinancialValues: boolean;
};
