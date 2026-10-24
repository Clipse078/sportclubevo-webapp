import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";
import type { ProjectionAggregateCoverage } from "@/lib/finance/projection/projection-workspace-coverage";
import type { ProjectionWorkspaceAccountViewModel } from "@/lib/finance/projection/projection-workspace-presentation";

export type ProjectionOutlookMetricKey = "INCOME" | "EXPENSE" | "RESULT";

export type ProjectionOutlookSeriesKey = "ACTUAL" | "FORECAST" | "PROJECTION" | "BUDGET";

export type ProjectionOutlookComparisonRow = {
  metric: ProjectionOutlookMetricKey;
  actualMinor: number | null;
  forecastMinor: number | null;
  projectionMinor: number | null;
  budgetMinor: number | null;
};

export type ProjectionCompositionSegment = {
  accountId: string;
  accountName: string;
  semantic: "INCOME" | "EXPENSE";
  projectedAmountMinor: number;
  shareOfSideTotal: number;
};

export type ProjectionForecastDivergenceRow = {
  accountId: string;
  accountName: string;
  semantic: "INCOME" | "EXPENSE";
  projectionMinor: number;
  forecastMinor: number;
  deltaMinor: number;
  absDeltaMinor: number;
};

export type ProjectionWorkspaceDashboardViewModel = {
  outlook: readonly ProjectionOutlookComparisonRow[];
  incomeComposition: readonly ProjectionCompositionSegment[];
  expenseComposition: readonly ProjectionCompositionSegment[];
  divergence: readonly ProjectionForecastDivergenceRow[] | null;
  confidenceNote: string | null;
};

const COMPOSITION_TOP_N = 8;
const MIN_DIVERGENCE_ROWS = 2;

function sumKnownActualMinor(
  accounts: readonly ProjectionWorkspaceAccountViewModel[],
  semantic: "INCOME" | "EXPENSE",
): number {
  return accounts
    .filter((a) => a.semantic === semantic)
    .reduce((sum, row) => sum + (row.knownActualAmountMinor ?? 0), 0);
}

function sumForecastMinor(
  accounts: readonly ProjectionWorkspaceAccountViewModel[],
  semantic: "INCOME" | "EXPENSE",
): number {
  const lines = accounts
    .filter((a) => a.semantic === semantic && a.forecastAmountMinor !== null)
    .map((row) => ({
      amountMinor: row.forecastAmountMinor!,
      financialAccount: { canonicalSemantic: semantic },
    }));
  if (lines.length === 0) return 0;
  const totals = computeBudgetPlanningTotals(lines);
  return semantic === "INCOME" ? totals.totalIncomeMinor : totals.totalExpenseMinor;
}

function buildComposition(
  accounts: readonly ProjectionWorkspaceAccountViewModel[],
  semantic: "INCOME" | "EXPENSE",
): readonly ProjectionCompositionSegment[] {
  const projected = accounts.filter(
    (a) => a.semantic === semantic && a.projectedAmountMinor !== null && a.accountName,
  );
  if (projected.length === 0) return [];
  const sideTotal = projected.reduce((s, r) => s + r.projectedAmountMinor!, 0);
  if (sideTotal <= 0) return [];

  const ranked = [...projected].sort(
    (a, b) => b.projectedAmountMinor! - a.projectedAmountMinor!,
  );
  const top = ranked.slice(0, COMPOSITION_TOP_N);
  return top.map((row) => ({
    accountId: row.accountId,
    accountName: row.accountName!,
    semantic,
    projectedAmountMinor: row.projectedAmountMinor!,
    shareOfSideTotal: row.projectedAmountMinor! / sideTotal,
  }));
}

function buildDivergence(
  accounts: readonly ProjectionWorkspaceAccountViewModel[],
): readonly ProjectionForecastDivergenceRow[] | null {
  const rows: ProjectionForecastDivergenceRow[] = [];
  for (const account of accounts) {
    if (
      account.projectedAmountMinor === null ||
      account.forecastAmountMinor === null ||
      account.deltaMinor === null ||
      !account.accountName
    ) {
      continue;
    }
    rows.push({
      accountId: account.accountId,
      accountName: account.accountName,
      semantic: account.semantic,
      projectionMinor: account.projectedAmountMinor,
      forecastMinor: account.forecastAmountMinor,
      deltaMinor: account.deltaMinor,
      absDeltaMinor: Math.abs(account.deltaMinor),
    });
  }
  if (rows.length < MIN_DIVERGENCE_ROWS) return null;
  return [...rows].sort((a, b) => b.absDeltaMinor - a.absDeltaMinor).slice(0, COMPOSITION_TOP_N);
}

function buildConfidenceNote(
  accounts: readonly ProjectionWorkspaceAccountViewModel[],
): string | null {
  const projected = accounts.filter((a) => a.projectedAmountMinor !== null);
  if (projected.length === 0) return null;
  const levels = new Set(projected.map((a) => a.confidence));
  if (levels.size <= 1) return null;
  return "Prognosesicherheit variiert je nach Position — Details pro Konto einsehbar.";
}

export function buildProjectionWorkspaceDashboard(input: {
  accounts: readonly ProjectionWorkspaceAccountViewModel[];
  coverage: ProjectionAggregateCoverage;
  budgetTotals: {
    incomeMinor: number | null;
    expenseMinor: number | null;
    resultMinor: number | null;
  } | null;
}): ProjectionWorkspaceDashboardViewModel {
  const incomeActual = sumKnownActualMinor(input.accounts, "INCOME");
  const expenseActual = sumKnownActualMinor(input.accounts, "EXPENSE");
  const incomeForecast = sumForecastMinor(input.accounts, "INCOME");
  const expenseForecast = sumForecastMinor(input.accounts, "EXPENSE");

  const outlook: ProjectionOutlookComparisonRow[] = [
    {
      metric: "INCOME",
      actualMinor: incomeActual,
      forecastMinor: incomeForecast,
      projectionMinor: input.coverage.income.complete
        ? input.coverage.income.projectedTotalMinor
        : input.coverage.projectedAccountCount > 0
          ? input.coverage.income.projectedTotalMinor
          : null,
      budgetMinor: input.budgetTotals?.incomeMinor ?? null,
    },
    {
      metric: "EXPENSE",
      actualMinor: expenseActual,
      forecastMinor: expenseForecast,
      projectionMinor: input.coverage.expense.complete
        ? input.coverage.expense.projectedTotalMinor
        : input.coverage.projectedAccountCount > 0
          ? input.coverage.expense.projectedTotalMinor
          : null,
      budgetMinor: input.budgetTotals?.expenseMinor ?? null,
    },
    {
      metric: "RESULT",
      actualMinor: incomeActual - expenseActual,
      forecastMinor: incomeForecast - expenseForecast,
      projectionMinor: input.coverage.result.minor,
      budgetMinor: input.budgetTotals?.resultMinor ?? null,
    },
  ];

  return {
    outlook,
    incomeComposition: buildComposition(input.accounts, "INCOME"),
    expenseComposition: buildComposition(input.accounts, "EXPENSE"),
    divergence: buildDivergence(input.accounts),
    confidenceNote: buildConfidenceNote(input.accounts),
  };
}
