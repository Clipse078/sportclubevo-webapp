import type { FinanceBudgetVersionStatus } from "@prisma/client";
import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import { FINANCIAL_MEASURE_APPROVED_BUDGET } from "@/lib/finance/reporting/financial-measures";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type ApprovedBudgetVersionWithLines = {
  id: string;
  status: FinanceBudgetVersionStatus;
  baseCurrency?: string | null;
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
  baseCurrency: string | null;
  valuesByAccountId: ReadonlyMap<string, number>;
};

export type ApprovedBudgetMeasureInput = {
  currentBaselineVersionId?: string | null;
  versions: ReadonlyArray<ApprovedBudgetVersionWithLines>;
};

function resolveApprovedBudgetMeasureFromInput(
  input: ApprovedBudgetMeasureInput,
): ApprovedBudgetMeasurePayload | null {
  const baselineVersion = resolveCurrentGovernanceBaselineVersion({
    currentBaselineVersionId: input.currentBaselineVersionId ?? null,
    versions: input.versions,
  });
  if (!baselineVersion) return null;

  const valuesByAccountId = new Map<string, number>();
  for (const line of baselineVersion.lines) {
    assertSafeAmountMinor(line.amountMinor);
    if (valuesByAccountId.has(line.financialAccountId)) {
      throw new Error("FINANCE_REPORTING_DUPLICATE_ACCOUNT_LINE");
    }
    valuesByAccountId.set(line.financialAccountId, line.amountMinor);
  }

  return {
    measure: FINANCIAL_MEASURE_APPROVED_BUDGET,
    budgetVersionId: baselineVersion.id,
    approvedAt: baselineVersion.approvedAt,
    baseCurrency: baselineVersion.baseCurrency?.trim().toUpperCase() ?? null,
    valuesByAccountId,
  };
}

/**
 * Resolves the current governance baseline for management reporting — never DRAFT revisions.
 */
export function resolveApprovedBudgetMeasure(
  input: ApprovedBudgetMeasureInput,
): ApprovedBudgetMeasurePayload | null;
export function resolveApprovedBudgetMeasure(
  versions: ReadonlyArray<ApprovedBudgetVersionWithLines>,
): ApprovedBudgetMeasurePayload | null;
export function resolveApprovedBudgetMeasure(
  input: ApprovedBudgetMeasureInput | ReadonlyArray<ApprovedBudgetVersionWithLines>,
): ApprovedBudgetMeasurePayload | null {
  if (Array.isArray(input)) {
    const versions = input as ReadonlyArray<ApprovedBudgetVersionWithLines>;
    return resolveApprovedBudgetMeasureFromInput({
      currentBaselineVersionId: null,
      versions,
    });
  }
  return resolveApprovedBudgetMeasureFromInput(input as ApprovedBudgetMeasureInput);
}

export function buildApprovedBudgetReportingContextKey(input: {
  tenantId: string;
  financeYearId: string;
  budgetVersionId: string;
}): string {
  return `${input.tenantId}:${input.financeYearId}:APPROVED_BUDGET:${input.budgetVersionId}`;
}
