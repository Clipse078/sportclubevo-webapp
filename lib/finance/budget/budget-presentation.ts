import type { CanonicalAccountSemantic, FinanceBudgetVersionStatus } from "@prisma/client";
import type { BudgetApprovalReadiness } from "@/lib/finance/budget/budget-approval-readiness";
import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";

export type BudgetAccountPlanningRow = {
  accountId: string;
  accountName: string;
  reportingGroupName: string;
  semantic: CanonicalAccountSemantic;
  lifecycle: "ACTIVE" | "ARCHIVED";
  lineId: string | null;
  amountMinor: number | null;
};

export type BudgetVersionHistoryEntry = {
  versionId: string;
  versionNumber: number;
  status: FinanceBudgetVersionStatus;
  approvedAt: Date | null;
  approvedByLabel: string | null;
  createdAt: Date;
  /** @deprecated use isCurrentBaseline — retained for transitional callers */
  isGovernanceBaseline: boolean;
  isCurrentBaseline: boolean;
  isHistoricalApproved: boolean;
};

export type BudgetApprovedBaselineSummary = {
  versionId: string;
  versionNumber: number;
  approvedAt: Date | null;
  approvedByLabel: string | null;
  currency: string | null;
  totals: {
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    resultMinor: number;
  };
};

export type BudgetWorkspaceSnapshot = {
  financeYearId: string;
  financeYearName: string;
  budgetId: string | null;
  versionId: string | null;
  versionNumber: number | null;
  status: "NONE" | "DRAFT" | "APPROVED" | "WORKING_REVISION";
  approvedAt: Date | null;
  approvedByLabel: string | null;
  currency: string | null;
  rows: BudgetAccountPlanningRow[];
  totals: {
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    resultMinor: number;
  };
  approvedBaseline: BudgetApprovedBaselineSummary | null;
  versionHistory: BudgetVersionHistoryEntry[];
  approvalReadiness: BudgetApprovalReadiness | null;
  approvalMode: "FIRST_APPROVAL" | "REBASELINE" | null;
};

export function buildBudgetPlanningRows(input: {
  accounts: ReadonlyArray<{
    id: string;
    name: string;
    lifecycle: "ACTIVE" | "ARCHIVED";
    canonicalSemantic: CanonicalAccountSemantic;
    reportingGroup: { name: string };
  }>;
  lines: ReadonlyArray<{
    id: string;
    financialAccountId: string;
    amountMinor: number;
    financialAccount: { canonicalSemantic: CanonicalAccountSemantic };
  }>;
}): BudgetWorkspaceSnapshot["rows"] {
  const lineByAccount = new Map(input.lines.map((line) => [line.financialAccountId, line]));
  return input.accounts
    .filter((account) => account.canonicalSemantic === "INCOME" || account.canonicalSemantic === "EXPENSE")
    .map((account) => {
      const line = lineByAccount.get(account.id);
      return {
        accountId: account.id,
        accountName: account.name,
        reportingGroupName: account.reportingGroup.name,
        semantic: account.canonicalSemantic,
        lifecycle: account.lifecycle,
        lineId: line?.id ?? null,
        amountMinor: line?.amountMinor ?? null,
      };
    });
}

export function buildBudgetVersionHistory(input: {
  versions: ReadonlyArray<{
    id: string;
    versionNumber: number;
    status: FinanceBudgetVersionStatus;
    approvedAt: Date | null;
    approvedBy: { firstName: string; lastName: string } | null;
    createdAt: Date;
  }>;
  governanceBaselineVersionId: string | null;
}): BudgetVersionHistoryEntry[] {
  return [...input.versions]
    .sort((a, b) => b.versionNumber - a.versionNumber)
    .map((version) => {
      const isCurrentBaseline = version.id === input.governanceBaselineVersionId;
      const isHistoricalApproved =
        version.status === "APPROVED" && !isCurrentBaseline;
      return {
        versionId: version.id,
        versionNumber: version.versionNumber,
        status: version.status,
        approvedAt: version.approvedAt,
        approvedByLabel: version.approvedBy
          ? `${version.approvedBy.firstName} ${version.approvedBy.lastName}`.trim()
          : null,
        createdAt: version.createdAt,
        isGovernanceBaseline: isCurrentBaseline,
        isCurrentBaseline,
        isHistoricalApproved,
      };
    });
}

export function budgetTotalsFromRows(
  rows: ReadonlyArray<{
    amountMinor: number | null;
    semantic: CanonicalAccountSemantic;
  }>,
) {
  const lines = rows
    .filter((row) => row.amountMinor !== null)
    .map((row) => ({
      amountMinor: row.amountMinor!,
      financialAccount: { canonicalSemantic: row.semantic },
    }));
  return computeBudgetPlanningTotals(lines);
}
