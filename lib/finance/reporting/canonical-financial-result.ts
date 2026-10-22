import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type CanonicalFinancialResult = {
  incomeMinor: number;
  expenseMinor: number;
  resultMinor: number;
};

export type CanonicalSemanticLine = {
  amountMinor: number;
  canonicalSemantic: string;
};

function addMinor(total: number, delta: number): number {
  assertSafeAmountMinor(delta);
  const next = total + delta;
  if (!Number.isSafeInteger(next)) {
    throw new Error("FINANCE_AMOUNT_OVERFLOW");
  }
  return next;
}

/** Canonical INCOME / EXPENSE totals and RESULT = INCOME − EXPENSE (integer minor units). */
export function computeCanonicalFinancialResult(
  lines: ReadonlyArray<CanonicalSemanticLine>,
): CanonicalFinancialResult {
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const line of lines) {
    if (line.canonicalSemantic === "INCOME") {
      incomeMinor = addMinor(incomeMinor, line.amountMinor);
    } else if (line.canonicalSemantic === "EXPENSE") {
      expenseMinor = addMinor(expenseMinor, line.amountMinor);
    }
  }
  return {
    incomeMinor,
    expenseMinor,
    resultMinor: incomeMinor - expenseMinor,
  };
}

export function mergeCanonicalFinancialResults(
  parts: ReadonlyArray<Pick<CanonicalFinancialResult, "incomeMinor" | "expenseMinor">>,
): CanonicalFinancialResult {
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const part of parts) {
    incomeMinor = addMinor(incomeMinor, part.incomeMinor);
    expenseMinor = addMinor(expenseMinor, part.expenseMinor);
  }
  return {
    incomeMinor,
    expenseMinor,
    resultMinor: incomeMinor - expenseMinor,
  };
}
