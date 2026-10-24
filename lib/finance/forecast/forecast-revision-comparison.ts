import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

/**
 * Neutral forecast revision delta (FIN-04C):
 * change = newForecast − previousForecast
 *
 * Favorability for income/expense remains a presentation concern — not assigned here.
 */
export type ForecastRevisionComparisonMetrics = {
  previousForecastMinor: number | null;
  newForecastMinor: number | null;
  hasPrevious: boolean;
  hasNew: boolean;
  rawRevisionDeltaMinor: number | null;
};

export function computeForecastRevisionComparisonMetrics(input: {
  previousForecastMinor: number | null;
  newForecastMinor: number | null;
}): ForecastRevisionComparisonMetrics {
  const hasPrevious = input.previousForecastMinor !== null;
  const hasNew = input.newForecastMinor !== null;

  if (!hasPrevious || !hasNew) {
    return {
      previousForecastMinor: hasPrevious ? input.previousForecastMinor : null,
      newForecastMinor: hasNew ? input.newForecastMinor : null,
      hasPrevious,
      hasNew,
      rawRevisionDeltaMinor: null,
    };
  }

  const previous = input.previousForecastMinor!;
  const next = input.newForecastMinor!;
  assertSafeAmountMinor(previous);
  assertSafeAmountMinor(next);

  return {
    previousForecastMinor: previous,
    newForecastMinor: next,
    hasPrevious: true,
    hasNew: true,
    rawRevisionDeltaMinor: next - previous,
  };
}

/** BASE → COMPARISON: delta = comparison − base (no favorability). */
export type FinanceForecastVersionComparisonSummary = {
  baseIncomeMinor: number;
  comparisonIncomeMinor: number;
  incomeDeltaMinor: number;
  baseExpenseMinor: number;
  comparisonExpenseMinor: number;
  expenseDeltaMinor: number;
  baseResultMinor: number;
  comparisonResultMinor: number;
  resultDeltaMinor: number;
};

export type ForecastAccountComparisonChangeKind =
  | "UNCHANGED"
  | "INCREASED"
  | "DECREASED"
  | "ADDED"
  | "REMOVED";

export type FinanceForecastAccountComparisonRow = {
  financialAccountId: string;
  accountType: "INCOME" | "EXPENSE";
  baseAmountMinor: number | null;
  comparisonAmountMinor: number | null;
  baseLinePresent: boolean;
  comparisonLinePresent: boolean;
  deltaMinor: number;
  changeKind: ForecastAccountComparisonChangeKind;
};

export type ForecastVersionLineInput = {
  financialAccountId: string;
  amountMinor: number;
  accountType: "INCOME" | "EXPENSE";
};

function totalsFromVersionLines(lines: readonly ForecastVersionLineInput[]) {
  return computeBudgetPlanningTotals(
    lines.map((line) => ({
      amountMinor: line.amountMinor,
      financialAccount: { canonicalSemantic: line.accountType },
    })),
  );
}

export function computeFinanceForecastVersionComparisonSummary(input: {
  baseLines: readonly ForecastVersionLineInput[];
  comparisonLines: readonly ForecastVersionLineInput[];
}): FinanceForecastVersionComparisonSummary {
  const baseTotals = totalsFromVersionLines(input.baseLines);
  const comparisonTotals = totalsFromVersionLines(input.comparisonLines);

  return {
    baseIncomeMinor: baseTotals.totalIncomeMinor,
    comparisonIncomeMinor: comparisonTotals.totalIncomeMinor,
    incomeDeltaMinor: comparisonTotals.totalIncomeMinor - baseTotals.totalIncomeMinor,
    baseExpenseMinor: baseTotals.totalExpenseMinor,
    comparisonExpenseMinor: comparisonTotals.totalExpenseMinor,
    expenseDeltaMinor: comparisonTotals.totalExpenseMinor - baseTotals.totalExpenseMinor,
    baseResultMinor: baseTotals.resultMinor,
    comparisonResultMinor: comparisonTotals.resultMinor,
    resultDeltaMinor: comparisonTotals.resultMinor - baseTotals.resultMinor,
  };
}

function resolveAccountChangeKind(input: {
  baseLinePresent: boolean;
  comparisonLinePresent: boolean;
  baseAmountMinor: number | null;
  comparisonAmountMinor: number | null;
}): ForecastAccountComparisonChangeKind {
  if (!input.baseLinePresent && input.comparisonLinePresent) {
    return "ADDED";
  }
  if (input.baseLinePresent && !input.comparisonLinePresent) {
    return "REMOVED";
  }
  const base = input.baseAmountMinor ?? 0;
  const comparison = input.comparisonAmountMinor ?? 0;
  if (base === comparison) {
    return "UNCHANGED";
  }
  return comparison > base ? "INCREASED" : "DECREASED";
}

export function computeFinanceForecastAccountComparisons(input: {
  baseLines: ReadonlyMap<string, number>;
  comparisonLines: ReadonlyMap<string, number>;
  accountTypes: ReadonlyMap<string, "INCOME" | "EXPENSE">;
  accountOrder: readonly string[];
}): FinanceForecastAccountComparisonRow[] {
  const accountIds = new Set<string>([
    ...input.baseLines.keys(),
    ...input.comparisonLines.keys(),
  ]);

  const orderedIds = [
    ...input.accountOrder.filter((id) => accountIds.has(id)),
    ...[...accountIds].filter((id) => !input.accountOrder.includes(id)).sort(),
  ];

  return orderedIds.flatMap((financialAccountId) => {
    const accountType = input.accountTypes.get(financialAccountId);
    if (!accountType) {
      return [];
    }

    const baseLinePresent = input.baseLines.has(financialAccountId);
    const comparisonLinePresent = input.comparisonLines.has(financialAccountId);
    const baseAmountMinor = baseLinePresent ? input.baseLines.get(financialAccountId)! : null;
    const comparisonAmountMinor = comparisonLinePresent
      ? input.comparisonLines.get(financialAccountId)!
      : null;

    const baseForDelta = baseLinePresent ? baseAmountMinor! : 0;
    const comparisonForDelta = comparisonLinePresent ? comparisonAmountMinor! : 0;
    assertSafeAmountMinor(baseForDelta);
    assertSafeAmountMinor(comparisonForDelta);

    return [
      {
        financialAccountId,
        accountType,
        baseAmountMinor,
        comparisonAmountMinor,
        baseLinePresent,
        comparisonLinePresent,
        deltaMinor: comparisonForDelta - baseForDelta,
        changeKind: resolveAccountChangeKind({
          baseLinePresent,
          comparisonLinePresent,
          baseAmountMinor,
          comparisonAmountMinor,
        }),
      },
    ];
  });
}

/** Largest absolute forecast changes — abs(delta) desc, then stable account order. */
export function sortForecastAccountComparisonsByLargestChange(
  rows: readonly FinanceForecastAccountComparisonRow[],
  accountOrder: readonly string[],
): FinanceForecastAccountComparisonRow[] {
  const orderIndex = new Map(accountOrder.map((id, index) => [id, index]));
  return [...rows].sort((a, b) => {
    const absDelta = Math.abs(b.deltaMinor) - Math.abs(a.deltaMinor);
    if (absDelta !== 0) return absDelta;
    return (orderIndex.get(a.financialAccountId) ?? 9999) -
      (orderIndex.get(b.financialAccountId) ?? 9999);
  });
}
