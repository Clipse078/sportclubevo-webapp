import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type ScenarioAdoptionAccountInput = {
  accountId: string;
  semantic: "INCOME" | "EXPENSE";
  lifecycle: "ACTIVE" | "ARCHIVED";
};

export type ScenarioAdoptionLineSource =
  | "SCENARIO_RESULT"
  | "CURRENT_FORECAST_PRESERVED"
  | "SCENARIO_ONLY_ACCOUNT";

export type ScenarioAdoptionLineResult = {
  accountId: string;
  semantic: "INCOME" | "EXPENSE";
  currentAmountMinor: number | null;
  proposedAmountMinor: number;
  source: ScenarioAdoptionLineSource;
};

export type ScenarioAdoptionPreviewResult = {
  sourceForecastVersionId: string;
  scenarioResultMinor: number;
  currentResultMinor: number;
  resultDeltaMinor: number;
  lines: readonly ScenarioAdoptionLineResult[];
  persistableLines: ReadonlyArray<{ financialAccountId: string; amountMinor: number }>;
};

/**
 * FIN-04D-06 adoption coverage (v1):
 * - Accounts in the scenario frozen baseline adopt the scenario calculated amount.
 * - Current-forecast-only accounts preserve today's amount (no silent delete/zero).
 * - Scenario baseline accounts missing from current forecast are included when still valid planning accounts.
 */
export function buildScenarioAdoptionPreview(input: {
  sourceForecastVersionId: string;
  scenarioBaselineAccountIds: ReadonlySet<string>;
  scenarioAmountByAccountId: ReadonlyMap<string, number>;
  currentForecastAmountByAccountId: ReadonlyMap<string, number | null>;
  accounts: readonly ScenarioAdoptionAccountInput[];
}): ScenarioAdoptionPreviewResult {
  const validPlanning = input.accounts.filter(
    (row) =>
      (row.semantic === "INCOME" || row.semantic === "EXPENSE") &&
      (row.lifecycle === "ACTIVE" || row.lifecycle === "ARCHIVED"),
  );
  const validIds = new Set(validPlanning.map((row) => row.accountId));

  const lines: ScenarioAdoptionLineResult[] = [];
  const persistableByAccount = new Map<string, number>();

  for (const account of validPlanning) {
    const inCurrent = input.currentForecastAmountByAccountId.has(account.accountId);
    const inScenarioBaseline = input.scenarioBaselineAccountIds.has(account.accountId);
    const scenarioAmount = input.scenarioAmountByAccountId.get(account.accountId);

    if (inScenarioBaseline) {
      if (scenarioAmount === undefined) {
        throw new Error("SCENARIO_ADOPTION_MISSING_SCENARIO_AMOUNT");
      }
      assertSafeAmountMinor(scenarioAmount);
      lines.push({
        accountId: account.accountId,
        semantic: account.semantic,
        currentAmountMinor: input.currentForecastAmountByAccountId.get(account.accountId) ?? null,
        proposedAmountMinor: scenarioAmount,
        source: "SCENARIO_RESULT",
      });
      persistableByAccount.set(account.accountId, scenarioAmount);
      continue;
    }

    if (inCurrent) {
      const current = input.currentForecastAmountByAccountId.get(account.accountId);
      if (current === null || current === undefined) {
        continue;
      }
      assertSafeAmountMinor(current);
      lines.push({
        accountId: account.accountId,
        semantic: account.semantic,
        currentAmountMinor: current,
        proposedAmountMinor: current,
        source: "CURRENT_FORECAST_PRESERVED",
      });
      persistableByAccount.set(account.accountId, current);
    }
  }

  for (const [accountId, scenarioAmount] of input.scenarioAmountByAccountId) {
    if (persistableByAccount.has(accountId)) continue;
    if (!input.scenarioBaselineAccountIds.has(accountId)) continue;
    if (!validIds.has(accountId)) continue;
    assertSafeAmountMinor(scenarioAmount);
    const account = validPlanning.find((row) => row.accountId === accountId);
    if (!account) continue;
    lines.push({
      accountId,
      semantic: account.semantic,
      currentAmountMinor: null,
      proposedAmountMinor: scenarioAmount,
      source: "SCENARIO_ONLY_ACCOUNT",
    });
    persistableByAccount.set(accountId, scenarioAmount);
  }

  const sortedPersistable = [...persistableByAccount.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([financialAccountId, amountMinor]) => ({ financialAccountId, amountMinor }));

  const currentTotals = totalsFromAccounts(validPlanning, (accountId) =>
    input.currentForecastAmountByAccountId.get(accountId) ?? null,
  );
  const proposedTotals = totalsFromAccounts(validPlanning, (accountId) =>
    persistableByAccount.get(accountId) ?? null,
  );

  return {
    sourceForecastVersionId: input.sourceForecastVersionId,
    scenarioResultMinor: proposedTotals.resultMinor,
    currentResultMinor: currentTotals.resultMinor,
    resultDeltaMinor: proposedTotals.resultMinor - currentTotals.resultMinor,
    lines,
    persistableLines: sortedPersistable,
  };
}

function totalsFromAccounts(
  accounts: readonly ScenarioAdoptionAccountInput[],
  amountForAccount: (accountId: string) => number | null,
): { incomeMinor: number; expenseMinor: number; resultMinor: number } {
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
