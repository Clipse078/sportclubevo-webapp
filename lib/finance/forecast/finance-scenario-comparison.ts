import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";
import type {
  FinanceScenarioAccountResult,
  FinanceScenarioCalculationTotals,
} from "@/lib/finance/forecast/finance-scenario-calculation-types";
import type {
  FinanceScenarioChangeFlags,
  FinanceScenarioPrimaryComparison,
  FinanceScenarioResultSummaryState,
} from "@/lib/finance/forecast/finance-scenario-read-model";
import {
  computeFinanceForecastAccountComparisons,
  computeFinanceForecastVersionComparisonSummary,
  type ForecastVersionLineInput,
} from "@/lib/finance/forecast/forecast-revision-comparison";

export function buildFinanceScenarioPrimaryComparison(
  totals: FinanceScenarioCalculationTotals,
): FinanceScenarioPrimaryComparison {
  return {
    baselineResultMinor: totals.baselineResultMinor,
    scenarioResultMinor: totals.resultMinor,
    resultDeltaMinor: totals.resultDeltaMinor,
    baselineIncomeMinor: totals.baselineIncomeMinor,
    scenarioIncomeMinor: totals.incomeMinor,
    incomeDeltaMinor: totals.incomeDeltaMinor,
    baselineExpenseMinor: totals.baselineExpenseMinor,
    scenarioExpenseMinor: totals.expenseMinor,
    expenseDeltaMinor: totals.expenseDeltaMinor,
  };
}

export function resolveFinanceScenarioChangeFlags(input: {
  totals: FinanceScenarioCalculationTotals;
  accountResults: readonly FinanceScenarioAccountResult[];
}): FinanceScenarioChangeFlags {
  const hasResultChange = input.totals.resultDeltaMinor !== 0;
  const hasIncomeChange = input.totals.incomeDeltaMinor !== 0;
  const hasExpenseChange = input.totals.expenseDeltaMinor !== 0;
  const hasAccountChanges = input.accountResults.some((row) => row.deltaMinor !== 0);
  const hasCompositionChange =
    !hasResultChange && (hasIncomeChange || hasExpenseChange || hasAccountChanges);

  return {
    hasResultChange,
    hasIncomeChange,
    hasExpenseChange,
    hasAccountChanges,
    hasCompositionChange,
  };
}

export function resolveFinanceScenarioResultSummaryState(input: {
  assumptionCount: number;
  changeFlags: FinanceScenarioChangeFlags;
}): FinanceScenarioResultSummaryState {
  if (input.assumptionCount === 0) {
    return "NO_ASSUMPTIONS";
  }
  if (input.changeFlags.hasResultChange || input.changeFlags.hasCompositionChange) {
    return "RESULT_CHANGED";
  }
  return "NO_RESULT_CHANGE";
}

export function computeScenarioVsCurrentForecastComparison(input: {
  scenarioAccountResults: readonly FinanceScenarioAccountResult[];
  currentForecastLines: readonly ForecastVersionLineInput[];
  accountTypes: ReadonlyMap<string, "INCOME" | "EXPENSE">;
  accountOrder: readonly string[];
}) {
  const scenarioLinesByAccount = new Map<string, number>();
  for (const row of input.scenarioAccountResults) {
    scenarioLinesByAccount.set(row.financialAccountId, row.scenarioAmountMinor);
  }
  const currentLinesByAccount = new Map<string, number>();
  for (const line of input.currentForecastLines) {
    currentLinesByAccount.set(line.financialAccountId, line.amountMinor);
  }

  const scenarioLines: ForecastVersionLineInput[] = [];
  for (const row of input.scenarioAccountResults) {
    const accountType = input.accountTypes.get(row.financialAccountId);
    if (!accountType) {
      continue;
    }
    scenarioLines.push({
      financialAccountId: row.financialAccountId,
      amountMinor: row.scenarioAmountMinor,
      accountType,
    });
  }

  const summary = computeFinanceForecastVersionComparisonSummary({
    baseLines: input.currentForecastLines,
    comparisonLines: scenarioLines,
  });

  const accountRows = computeFinanceForecastAccountComparisons({
    baseLines: currentLinesByAccount,
    comparisonLines: scenarioLinesByAccount,
    accountTypes: input.accountTypes,
    accountOrder: input.accountOrder,
  });

  return {
    summary: {
      currentForecastResultMinor: summary.baseResultMinor,
      currentForecastIncomeMinor: summary.baseIncomeMinor,
      currentForecastExpenseMinor: summary.baseExpenseMinor,
      scenarioVsCurrentResultDeltaMinor: summary.resultDeltaMinor,
      scenarioVsCurrentIncomeDeltaMinor: summary.incomeDeltaMinor,
      scenarioVsCurrentExpenseDeltaMinor: summary.expenseDeltaMinor,
    },
    accountComparisons: accountRows.map((row) => ({
      ...row,
      scenarioAmountMinor: row.comparisonAmountMinor ?? 0,
      currentForecastAmountMinor: row.baseAmountMinor,
      currentForecastLinePresent: row.baseLinePresent,
    })),
  };
}

export function computeScenarioVsApprovedBudgetTotals(input: {
  scenarioTotals: FinanceScenarioCalculationTotals;
  approvedBudgetLines: readonly ForecastVersionLineInput[];
}) {
  const budgetTotals = computeBudgetPlanningTotals(
    input.approvedBudgetLines.map((line) => ({
      amountMinor: line.amountMinor,
      financialAccount: { canonicalSemantic: line.accountType },
    })),
  );

  return {
    approvedBudgetResultMinor: budgetTotals.resultMinor,
    approvedBudgetIncomeMinor: budgetTotals.totalIncomeMinor,
    approvedBudgetExpenseMinor: budgetTotals.totalExpenseMinor,
    scenarioVsApprovedBudgetResultDeltaMinor:
      input.scenarioTotals.resultMinor - budgetTotals.resultMinor,
    scenarioVsApprovedBudgetIncomeDeltaMinor:
      input.scenarioTotals.incomeMinor - budgetTotals.totalIncomeMinor,
    scenarioVsApprovedBudgetExpenseDeltaMinor:
      input.scenarioTotals.expenseMinor - budgetTotals.totalExpenseMinor,
  };
}
