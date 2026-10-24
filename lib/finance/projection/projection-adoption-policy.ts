import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";

export type ProjectionAdoptionAccountInput = {
  accountId: string;
  semantic: "INCOME" | "EXPENSE";
  lifecycle: "ACTIVE" | "ARCHIVED";
};

export type ProjectionAdoptionLineSource = "PROJECTION" | "FORECAST_PRESERVED";

export type ProjectionAdoptionLineResult = {
  accountId: string;
  semantic: "INCOME" | "EXPENSE";
  currentAmountMinor: number | null;
  proposedAmountMinor: number | null;
  source: ProjectionAdoptionLineSource;
  /** True when a non-null projection replaces or sets the forecast amount. */
  adoptedFromProjection: boolean;
};

export type ProjectionAdoptionAggregateTotals = {
  incomeMinor: number;
  expenseMinor: number;
  resultMinor: number;
};

export type ProjectionAdoptionPreviewResult = {
  projectionVersionId: string;
  sourceForecastVersionId: string;
  eligibleAccountCount: number;
  unchangedAccountCount: number;
  lines: readonly ProjectionAdoptionLineResult[];
  currentTotals: ProjectionAdoptionAggregateTotals;
  proposedTotals: ProjectionAdoptionAggregateTotals;
  persistableLines: ReadonlyArray<{ financialAccountId: string; amountMinor: number }>;
};

/**
 * Canonical adoption policy (FIN-04B-06):
 * - Accounts with a non-null projected amount adopt exact projectedAmountMinor.
 * - Accounts without projection preserve existing current forecast amounts.
 * - Missing projection never becomes zero and never fabricates a value.
 * - Complete version snapshot includes every line that will exist after adoption.
 */
export function buildProjectionAdoptionPreview(input: {
  projectionVersionId: string;
  sourceForecastVersionId: string;
  accounts: readonly ProjectionAdoptionAccountInput[];
  projectedAmountByAccountId: ReadonlyMap<string, number | null>;
  currentForecastAmountByAccountId: ReadonlyMap<string, number | null>;
}): ProjectionAdoptionPreviewResult {
  const activePlanning = input.accounts.filter(
    (row) =>
      row.lifecycle === "ACTIVE" && (row.semantic === "INCOME" || row.semantic === "EXPENSE"),
  );

  const lines: ProjectionAdoptionLineResult[] = [];
  let eligibleAccountCount = 0;
  let unchangedAccountCount = 0;

  for (const account of activePlanning) {
    const projected = input.projectedAmountByAccountId.get(account.accountId) ?? null;
    const current = input.currentForecastAmountByAccountId.get(account.accountId) ?? null;

    if (projected !== null) {
      eligibleAccountCount += 1;
      lines.push({
        accountId: account.accountId,
        semantic: account.semantic,
        currentAmountMinor: current,
        proposedAmountMinor: projected,
        source: "PROJECTION",
        adoptedFromProjection: true,
      });
      continue;
    }

    if (current !== null) {
      unchangedAccountCount += 1;
      lines.push({
        accountId: account.accountId,
        semantic: account.semantic,
        currentAmountMinor: current,
        proposedAmountMinor: current,
        source: "FORECAST_PRESERVED",
        adoptedFromProjection: false,
      });
    }
  }

  const currentTotals = totalsFromLines(
    activePlanning,
    (accountId) => input.currentForecastAmountByAccountId.get(accountId) ?? null,
  );
  const proposedTotals = totalsFromLines(activePlanning, (accountId) => {
    const line = lines.find((row) => row.accountId === accountId);
    return line?.proposedAmountMinor ?? null;
  });

  const persistableLines = lines
    .filter((row): row is ProjectionAdoptionLineResult & { proposedAmountMinor: number } =>
      row.proposedAmountMinor !== null,
    )
    .map((row) => ({
      financialAccountId: row.accountId,
      amountMinor: row.proposedAmountMinor,
    }));

  return {
    projectionVersionId: input.projectionVersionId,
    sourceForecastVersionId: input.sourceForecastVersionId,
    eligibleAccountCount,
    unchangedAccountCount,
    lines,
    currentTotals,
    proposedTotals,
    persistableLines,
  };
}

function totalsFromLines(
  accounts: readonly ProjectionAdoptionAccountInput[],
  amountForAccount: (accountId: string) => number | null,
): ProjectionAdoptionAggregateTotals {
  const planningLines: Array<{
    amountMinor: number;
    financialAccount: { canonicalSemantic: "INCOME" | "EXPENSE" };
  }> = [];
  for (const account of accounts) {
    const amountMinor = amountForAccount(account.accountId);
    if (amountMinor === null) continue;
    planningLines.push({
      amountMinor,
      financialAccount: { canonicalSemantic: account.semantic },
    });
  }
  const totals = computeBudgetPlanningTotals(planningLines);
  return {
    incomeMinor: totals.totalIncomeMinor,
    expenseMinor: totals.totalExpenseMinor,
    resultMinor: totals.resultMinor,
  };
}
