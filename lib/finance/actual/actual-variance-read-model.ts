import type { BudgetComparisonMode } from "@/lib/finance/actual/period-semantics";
import {
  aggregateActualTotalsByAccount,
  summarizeActualFinancialResult,
  type ActualEntryRow,
} from "@/lib/finance/actual/aggregate-actuals";
import {
  computeAccountVarianceMetrics,
  type AccountVarianceMetrics,
} from "@/lib/finance/actual/variance-semantics";
import type { ApprovedBudgetMeasurePayload } from "@/lib/finance/reporting/approved-budget-measure-provider";
import {
  computeCanonicalFinancialResult,
  type CanonicalFinancialResult,
} from "@/lib/finance/reporting/canonical-financial-result";

export type ActualVarianceAvailability =
  | "AVAILABLE"
  | "NO_BASE_CURRENCY"
  | "NO_FINANCE_YEAR"
  | "NO_STRUCTURE";

export type ActualVarianceAccountRow = {
  accountId: string;
  accountName: string;
  canonicalSemantic: "INCOME" | "EXPENSE";
  lifecycle: "ACTIVE" | "ARCHIVED";
  metrics: AccountVarianceMetrics;
};

export type ActualVarianceReadModel = {
  tenantId: string;
  financeYearId: string;
  financeYearName: string;
  comparisonMode: BudgetComparisonMode;
  ytdCutoffDate: Date | null;
  baseCurrency: string | null;
  availability: ActualVarianceAvailability;
  approvedBudgetVersionId: string | null;
  /** Full-year approved budget vs actual — canonical when mode is FULL_YEAR. */
  fullYearVarianceSupported: boolean;
  /** YTD budget variance is not computed until budget phasing exists (FIN-03A). */
  ytdBudgetVarianceSupported: false;
  accounts: ActualVarianceAccountRow[];
  actualSummary: CanonicalFinancialResult;
  budgetSummary: CanonicalFinancialResult | null;
  fullYearVarianceSummary: CanonicalFinancialResult | null;
};

export function buildActualVarianceReadModel(input: {
  tenantId: string;
  financeYearId: string;
  financeYearName: string;
  baseCurrency: string | null;
  comparisonMode: BudgetComparisonMode;
  ytdCutoffDate: Date | null;
  approvedMeasure: ApprovedBudgetMeasurePayload | null;
  accounts: ReadonlyArray<{
    id: string;
    name: string;
    canonicalSemantic: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
  actualEntries: ReadonlyArray<ActualEntryRow>;
}): ActualVarianceReadModel {
  const actualTotals = aggregateActualTotalsByAccount(input.actualEntries);

  const accountRows: ActualVarianceAccountRow[] = input.accounts.map((account) => {
    const actualMinor = actualTotals.has(account.id) ? actualTotals.get(account.id)! : null;
    const approvedBudgetMinor =
      input.approvedMeasure?.valuesByAccountId.get(account.id) ?? null;

    return {
      accountId: account.id,
      accountName: account.name,
      canonicalSemantic: account.canonicalSemantic,
      lifecycle: account.lifecycle,
      metrics: computeAccountVarianceMetrics({
        canonicalSemantic: account.canonicalSemantic,
        approvedBudgetMinor,
        actualMinor,
      }),
    };
  });

  const actualSummary = summarizeActualFinancialResult(input.actualEntries);

  let budgetSummary: CanonicalFinancialResult | null = null;
  if (input.approvedMeasure) {
    const budgetLines = input.accounts.map((account) => ({
      amountMinor: input.approvedMeasure!.valuesByAccountId.get(account.id) ?? 0,
      canonicalSemantic: account.canonicalSemantic,
    }));
    budgetSummary = computeCanonicalFinancialResult(budgetLines);
  }

  const fullYearVarianceSupported =
    input.comparisonMode === "FULL_YEAR" && input.approvedMeasure !== null;

  let fullYearVarianceSummary: CanonicalFinancialResult | null = null;
  if (fullYearVarianceSupported && budgetSummary) {
    fullYearVarianceSummary = {
      incomeMinor: actualSummary.incomeMinor - budgetSummary.incomeMinor,
      expenseMinor: actualSummary.expenseMinor - budgetSummary.expenseMinor,
      resultMinor: actualSummary.resultMinor - budgetSummary.resultMinor,
    };
  }

  return {
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    financeYearName: input.financeYearName,
    comparisonMode: input.comparisonMode,
    ytdCutoffDate: input.ytdCutoffDate,
    baseCurrency: input.baseCurrency,
    availability: "AVAILABLE",
    approvedBudgetVersionId: input.approvedMeasure?.budgetVersionId ?? null,
    fullYearVarianceSupported,
    ytdBudgetVarianceSupported: false,
    accounts: accountRows,
    actualSummary,
    budgetSummary,
    fullYearVarianceSummary,
  };
}
