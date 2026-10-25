import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";
import type {
  FinanceComparativeGrainExplanationKey,
  FinanceComparativePresentationRole,
} from "@/lib/finance/reporting/comparative-comparison-availability";
import type {
  ManagementPnlMeasureCell,
  ManagementPnlAccountRow,
} from "@/lib/finance/reporting/finance-management-pnl-read-model";

export type FinanceReportingDetailTargetKind = "ACCOUNT" | "REPORTING_GROUP";

export type FinanceReportingHierarchyPathSegment = {
  kind: "reporting_group" | "residual";
  id: string;
  name: string;
};

export type FinanceActualEvidenceEntry = {
  entryId: string;
  effectiveDate: Date;
  amountMinor: number;
  currency: string;
  description: string | null;
};

export type FinanceReportingDetailActualEvidence = {
  availability: "AVAILABLE" | "NOT_VISIBLE" | "NO_ENTRIES";
  entries: FinanceActualEvidenceEntry[];
};

export type FinanceReportingSourceAction = {
  canNavigate: boolean;
  href: string | null;
};

export type FinanceReportingDetailSourceActions = {
  budget: FinanceReportingSourceAction;
  actual: FinanceReportingSourceAction;
  forecast: FinanceReportingSourceAction;
  timing: FinanceReportingSourceAction;
};

export type FinanceReportingGroupChildAccountSummary = Pick<
  ManagementPnlAccountRow,
  "accountId" | "name" | "lifecycle" | "forecastVsBudget" | "approvedBudget" | "actual" | "currentForecast"
>;

export type FinanceManagementReportingDetailReadModel = {
  tenantId: string;
  financeYearId: string;
  financeYearName: string;
  baseCurrency: string | null;
  availability: "AVAILABLE" | "NOT_FOUND" | "NO_FINANCE_YEAR" | "NO_STRUCTURE";
  targetKind: FinanceReportingDetailTargetKind;
  accountId: string | null;
  groupId: string | null;
  name: string;
  lifecycle: "ACTIVE" | "ARCHIVED";
  archivedAt: Date | null;
  canonicalSemantic: "INCOME" | "EXPENSE";
  hierarchyPath: FinanceReportingHierarchyPathSegment[];
  isUnassignedResidual: boolean;
  actualGrain: "ANNUAL_FULL_YEAR" | "YTD" | null;
  actualCutoffDate: Date | null;
  approvedBudget: ManagementPnlMeasureCell;
  actual: ManagementPnlMeasureCell;
  currentForecast: ManagementPnlMeasureCell;
  forecastVsBudget: FinanceReportingComparisonSlice;
  comparativePeriodContext: {
    actualVsBudgetVarianceRole: FinanceComparativePresentationRole;
    grainExplanationKey: FinanceComparativeGrainExplanationKey | null;
  };
  actualEvidence: FinanceReportingDetailActualEvidence;
  sourceActions: FinanceReportingDetailSourceActions;
  /** Direct child accounts when target is a reporting group. */
  childAccountSummaries: FinanceReportingGroupChildAccountSummary[];
};
