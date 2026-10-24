import type { CanonicalAccountSemantic } from "@prisma/client";
import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";
import type { ForecastHistoryDisplayMetadata } from "@/lib/finance/forecast/forecast-revision-presentation";
import type { ForecastRevisionSource } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";

export type ForecastAccountPlanningRow = {
  accountId: string;
  accountName: string;
  reportingGroupName: string;
  semantic: CanonicalAccountSemantic;
  lifecycle: "ACTIVE" | "ARCHIVED";
  lineId: string | null;
  amountMinor: number | null;
  approvedBudgetMinor: number | null;
  comparison: {
    rawForecastDeltaMinor: number | null;
    favorability: "FAVORABLE" | "UNFAVORABLE" | "ON_PLAN" | null;
  };
};

export type ForecastCurrentRevisionPresentation = {
  revisionLabel: string | null;
  revisionSource: ForecastRevisionSource | null;
  asOfDate: string | null;
  presentation: ForecastHistoryDisplayMetadata;
};

export type ForecastWorkspaceSnapshot = {
  financeYearId: string;
  financeYearName: string;
  forecastId: string | null;
  versionId: string | null;
  versionNumber: number | null;
  status: "NONE" | "CURRENT";
  currency: string | null;
  /** Recommended Datenstand for formalization (inside finance year); null if none. */
  recommendedFormalReforecastAsOfDate: string | null;
  currentRevision: ForecastCurrentRevisionPresentation | null;
  rows: ForecastAccountPlanningRow[];
  totals: {
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    resultMinor: number;
  };
  approvedBaselineTotals: {
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    resultMinor: number;
  } | null;
};

export function buildForecastPlanningRows(input: {
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
  }>;
  approvedBudgetByAccount: ReadonlyMap<string, number>;
  comparisonForAccount: (
    semantic: "INCOME" | "EXPENSE",
    budgetMinor: number | null,
    forecastMinor: number | null,
  ) => ForecastAccountPlanningRow["comparison"];
}): ForecastWorkspaceSnapshot["rows"] {
  const lineByAccount = new Map(input.lines.map((line) => [line.financialAccountId, line]));
  return input.accounts
    .filter(
      (account) => account.canonicalSemantic === "INCOME" || account.canonicalSemantic === "EXPENSE",
    )
    .map((account) => {
      const line = lineByAccount.get(account.id);
      const forecastMinor = line?.amountMinor ?? null;
      const approvedBudgetMinor = input.approvedBudgetByAccount.get(account.id) ?? null;
      const semantic = account.canonicalSemantic as "INCOME" | "EXPENSE";
      return {
        accountId: account.id,
        accountName: account.name,
        reportingGroupName: account.reportingGroup.name,
        semantic,
        lifecycle: account.lifecycle,
        lineId: line?.id ?? null,
        amountMinor: forecastMinor,
        approvedBudgetMinor,
        comparison: input.comparisonForAccount(semantic, approvedBudgetMinor, forecastMinor),
      };
    });
}

export function forecastTotalsFromRows(
  rows: ReadonlyArray<{
    amountMinor: number | null;
    semantic: CanonicalAccountSemantic;
  }>,
) {
  const normalized = rows
    .filter((row) => row.amountMinor !== null)
    .map((row) => ({
      amountMinor: row.amountMinor!,
      financialAccount: { canonicalSemantic: row.semantic },
    }));
  return computeBudgetPlanningTotals(normalized);
}
