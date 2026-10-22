export type BudgetPlanningTotals = {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  resultMinor: number;
};

export function computeBudgetPlanningTotals(
  lines: ReadonlyArray<{ amountMinor: number; financialAccount: { canonicalSemantic: string } }>,
): BudgetPlanningTotals {
  let totalIncomeMinor = 0;
  let totalExpenseMinor = 0;
  for (const line of lines) {
    if (line.financialAccount.canonicalSemantic === "INCOME") {
      totalIncomeMinor += line.amountMinor;
    } else if (line.financialAccount.canonicalSemantic === "EXPENSE") {
      totalExpenseMinor += line.amountMinor;
    }
  }
  return {
    totalIncomeMinor,
    totalExpenseMinor,
    resultMinor: totalIncomeMinor - totalExpenseMinor,
  };
}
