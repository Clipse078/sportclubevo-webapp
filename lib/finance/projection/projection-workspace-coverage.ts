import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";

export type ProjectionCoverageAccountInput = {
  accountId: string;
  semantic: "INCOME" | "EXPENSE";
  lifecycle: "ACTIVE" | "ARCHIVED";
  projectedAmountMinor: number | null;
};

export type ProjectionAggregateCoverage = {
  eligibleAccountCount: number;
  projectedAccountCount: number;
  missingProjectionCount: number;
  coverageStatus: "NONE" | "PARTIAL" | "FULL";
  income: {
    projectedTotalMinor: number;
    complete: boolean;
    consideredCount: number;
    projectedCount: number;
  };
  expense: {
    projectedTotalMinor: number;
    complete: boolean;
    consideredCount: number;
    projectedCount: number;
  };
  result: {
    minor: number | null;
    complete: boolean;
  };
};

/**
 * Aggregate SCE projection totals without treating missing lines as zero.
 * Only ACTIVE income/expense accounts are considered for coverage completeness.
 */
export function computeProjectionAggregateCoverage(
  accounts: readonly ProjectionCoverageAccountInput[],
): ProjectionAggregateCoverage {
  const eligible = accounts.filter(
    (row) =>
      row.lifecycle === "ACTIVE" && (row.semantic === "INCOME" || row.semantic === "EXPENSE"),
  );

  const projected = eligible.filter((row) => row.projectedAmountMinor !== null);
  const missingProjectionCount = eligible.length - projected.length;

  const incomeEligible = eligible.filter((row) => row.semantic === "INCOME");
  const expenseEligible = eligible.filter((row) => row.semantic === "EXPENSE");

  const incomeProjected = incomeEligible.filter((row) => row.projectedAmountMinor !== null);
  const expenseProjected = expenseEligible.filter((row) => row.projectedAmountMinor !== null);

  const incomeComplete =
    incomeEligible.length === 0 ||
    incomeProjected.length === incomeEligible.length;
  const expenseComplete =
    expenseEligible.length === 0 ||
    expenseProjected.length === expenseEligible.length;

  const incomeTotals = computeBudgetPlanningTotals(
    incomeProjected.map((row) => ({
      amountMinor: row.projectedAmountMinor!,
      financialAccount: { canonicalSemantic: "INCOME" as const },
    })),
  );
  const expenseTotals = computeBudgetPlanningTotals(
    expenseProjected.map((row) => ({
      amountMinor: row.projectedAmountMinor!,
      financialAccount: { canonicalSemantic: "EXPENSE" as const },
    })),
  );

  const resultComplete = incomeComplete && expenseComplete;
  const resultMinor = resultComplete
    ? incomeTotals.totalIncomeMinor - expenseTotals.totalExpenseMinor
    : null;

  let coverageStatus: ProjectionAggregateCoverage["coverageStatus"] = "NONE";
  if (projected.length === 0) {
    coverageStatus = "NONE";
  } else if (missingProjectionCount === 0 && eligible.length > 0) {
    coverageStatus = "FULL";
  } else {
    coverageStatus = "PARTIAL";
  }

  return {
    eligibleAccountCount: eligible.length,
    projectedAccountCount: projected.length,
    missingProjectionCount,
    coverageStatus,
    income: {
      projectedTotalMinor: incomeTotals.totalIncomeMinor,
      complete: incomeComplete,
      consideredCount: incomeEligible.length,
      projectedCount: incomeProjected.length,
    },
    expense: {
      projectedTotalMinor: expenseTotals.totalExpenseMinor,
      complete: expenseComplete,
      consideredCount: expenseEligible.length,
      projectedCount: expenseProjected.length,
    },
    result: {
      minor: resultMinor,
      complete: resultComplete,
    },
  };
}
