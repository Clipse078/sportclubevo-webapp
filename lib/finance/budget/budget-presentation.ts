import type { CanonicalAccountSemantic } from "@prisma/client";
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

export type BudgetWorkspaceSnapshot = {
  financeYearId: string;
  financeYearName: string;
  budgetId: string | null;
  versionId: string | null;
  status: "NONE" | "DRAFT" | "APPROVED";
  approvedAt: Date | null;
  approvedByLabel: string | null;
  currency: string | null;
  rows: BudgetAccountPlanningRow[];
  totals: {
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    resultMinor: number;
  };
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
