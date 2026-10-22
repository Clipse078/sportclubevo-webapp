import type { CanonicalAccountSemantic } from "@prisma/client";
import type { CanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";
import type { FinancialMeasureKey, FinancialReportingMode } from "@/lib/finance/reporting/financial-measures";

export type FinancialReportingAvailability =
  | "AVAILABLE"
  | "NO_BASE_CURRENCY"
  | "NO_FINANCE_YEAR"
  | "NO_STRUCTURE"
  | "NO_APPROVED_BASELINE";

export type FinancialReportingAccountNode = {
  kind: "account";
  accountId: string;
  name: string;
  reportingGroupId: string;
  sortOrder: number;
  lifecycle: "ACTIVE" | "ARCHIVED";
  archivedAt: Date | null;
  canonicalSemantic: Extract<CanonicalAccountSemantic, "INCOME" | "EXPENSE">;
  amountMinor: number;
};

export type FinancialReportingGroupNode = {
  kind: "reporting_group";
  groupId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  lifecycle: "ACTIVE" | "ARCHIVED";
  archivedAt: Date | null;
  incomeMinor: number;
  expenseMinor: number;
  children: FinancialReportingTreeNode[];
};

export type FinancialReportingResultNode = {
  kind: "result";
  incomeMinor: number;
  expenseMinor: number;
  resultMinor: number;
};

export type FinancialReportingTreeNode =
  | FinancialReportingGroupNode
  | FinancialReportingAccountNode;

export type FinancialReportingReadModel = {
  tenantId: string;
  financeYearId: string | null;
  financeYearName: string | null;
  measure: FinancialMeasureKey;
  mode: FinancialReportingMode;
  baseCurrency: string | null;
  availability: FinancialReportingAvailability;
  /** Stable context for future publication snapshotting (live query metadata). */
  reportingContextKey: string | null;
  approvedBudgetVersionId: string | null;
  approvedAt: Date | null;
  tree: FinancialReportingTreeNode[];
  summary: CanonicalFinancialResult;
};
