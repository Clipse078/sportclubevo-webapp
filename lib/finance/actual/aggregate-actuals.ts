import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import {
  computeCanonicalFinancialResult,
  type CanonicalFinancialResult,
} from "@/lib/finance/reporting/canonical-financial-result";

export type ActualEntryRow = {
  financialAccountId: string;
  canonicalSemantic: "INCOME" | "EXPENSE";
  amountMinor: number;
};

export function aggregateActualTotalsByAccount(
  entries: ReadonlyArray<Pick<ActualEntryRow, "financialAccountId" | "amountMinor">>,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    assertSafeAmountMinor(entry.amountMinor);
    const prev = totals.get(entry.financialAccountId) ?? 0;
    const next = prev + entry.amountMinor;
    if (!Number.isSafeInteger(next)) {
      throw new Error("FINANCE_AMOUNT_OVERFLOW");
    }
    totals.set(entry.financialAccountId, next);
  }
  return totals;
}

export function summarizeActualFinancialResult(
  lines: ReadonlyArray<ActualEntryRow>,
): CanonicalFinancialResult {
  return computeCanonicalFinancialResult(lines);
}
