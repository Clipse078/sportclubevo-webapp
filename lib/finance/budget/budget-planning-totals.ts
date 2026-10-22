import { computeCanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";

export type BudgetPlanningTotals = {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  resultMinor: number;
};

export function computeBudgetPlanningTotals(
  lines: ReadonlyArray<{ amountMinor: number; financialAccount: { canonicalSemantic: string } }>,
): BudgetPlanningTotals {
  const result = computeCanonicalFinancialResult(
    lines.map((line) => ({
      amountMinor: line.amountMinor,
      canonicalSemantic: line.financialAccount.canonicalSemantic,
    })),
  );
  return {
    totalIncomeMinor: result.incomeMinor,
    totalExpenseMinor: result.expenseMinor,
    resultMinor: result.resultMinor,
  };
}
