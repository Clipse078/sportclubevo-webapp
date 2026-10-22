import type { FinanceBudgetVersionStatus } from "@prisma/client";
import { FINANCIAL_MEASURE_APPROVED_BUDGET } from "@/lib/finance/reporting/financial-measures";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type ApprovedBudgetVersionWithLines = {
  id: string;
  status: FinanceBudgetVersionStatus;
  approvedAt: Date | null;
  lines: ReadonlyArray<{
    financialAccountId: string;
    amountMinor: number;
  }>;
};

export type ApprovedBudgetMeasurePayload = {
  measure: typeof FINANCIAL_MEASURE_APPROVED_BUDGET;
  budgetVersionId: string;
  approvedAt: Date | null;
  valuesByAccountId: ReadonlyMap<string, number>;
};

/**
 * Resolves APPROVED budget baseline only — never substitutes DRAFT for management reporting.
 */
export function resolveApprovedBudgetMeasure(
  versions: ReadonlyArray<ApprovedBudgetVersionWithLines>,
): ApprovedBudgetMeasurePayload | null {
  const approved = versions.find((v) => v.status === "APPROVED") ?? null;
  if (!approved) return null;

  const valuesByAccountId = new Map<string, number>();
  for (const line of approved.lines) {
    assertSafeAmountMinor(line.amountMinor);
    if (valuesByAccountId.has(line.financialAccountId)) {
      throw new Error("FINANCE_REPORTING_DUPLICATE_ACCOUNT_LINE");
    }
    valuesByAccountId.set(line.financialAccountId, line.amountMinor);
  }

  return {
    measure: FINANCIAL_MEASURE_APPROVED_BUDGET,
    budgetVersionId: approved.id,
    approvedAt: approved.approvedAt,
    valuesByAccountId,
  };
}

export function buildApprovedBudgetReportingContextKey(input: {
  tenantId: string;
  financeYearId: string;
  budgetVersionId: string;
}): string {
  return `${input.tenantId}:${input.financeYearId}:APPROVED_BUDGET:${input.budgetVersionId}`;
}
