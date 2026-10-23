import {
  aggregateActualTotalsByAccount,
  summarizeActualFinancialResult,
  type ActualEntryRow,
} from "@/lib/finance/actual/aggregate-actuals";
import type { FinanceMeasurementMode } from "@/lib/finance/actual/finance-measurement-period";
import {
  computeAccountVarianceMetrics,
  type AccountVarianceMetrics,
} from "@/lib/finance/actual/variance-semantics";
import type { ApprovedBudgetMeasurePayload } from "@/lib/finance/reporting/approved-budget-measure-provider";
import {
  computeCanonicalFinancialResult,
  type CanonicalFinancialResult,
} from "@/lib/finance/reporting/canonical-financial-result";

export type AccountPeriodicMetrics = {
  accountId: string;
  accountName: string;
  canonicalSemantic: "INCOME" | "EXPENSE";
  lifecycle: "ACTIVE" | "ARCHIVED";
  approvedBudgetMinor: number | null;
  periodActualMinor: number | null;
  ytdActualMinor: number | null;
  fullYearActualMinor: number | null;
  /** Full-year variance metrics — valid only when mode is FULL_YEAR. */
  fullYearVariance: AccountVarianceMetrics | null;
};

export type PeriodicActualReadModel = {
  measurementMode: FinanceMeasurementMode;
  periodSummary: CanonicalFinancialResult;
  ytdSummary: CanonicalFinancialResult;
  fullYearActualSummary: CanonicalFinancialResult;
  budgetSummary: CanonicalFinancialResult | null;
  approvedBudgetVersionId: string | null;
  periodBudgetVarianceSupported: false;
  ytdBudgetVarianceSupported: false;
  fullYearVarianceSupported: boolean;
  accounts: AccountPeriodicMetrics[];
};

function mapActualMinor(
  totals: Map<string, number>,
  accountId: string,
): number | null {
  return totals.has(accountId) ? totals.get(accountId)! : null;
}

export function buildPeriodicActualReadModel(input: {
  measurementMode: FinanceMeasurementMode;
  approvedMeasure: ApprovedBudgetMeasurePayload | null;
  accounts: ReadonlyArray<{
    id: string;
    name: string;
    canonicalSemantic: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
  periodEntries: ReadonlyArray<ActualEntryRow>;
  ytdEntries: ReadonlyArray<ActualEntryRow>;
  fullYearEntries: ReadonlyArray<ActualEntryRow>;
}): PeriodicActualReadModel {
  const periodTotals = aggregateActualTotalsByAccount(input.periodEntries);
  const ytdTotals = aggregateActualTotalsByAccount(input.ytdEntries);
  const fullYearTotals = aggregateActualTotalsByAccount(input.fullYearEntries);

  const periodSummary = summarizeActualFinancialResult(input.periodEntries);
  const ytdSummary = summarizeActualFinancialResult(input.ytdEntries);
  const fullYearActualSummary = summarizeActualFinancialResult(input.fullYearEntries);

  let budgetSummary: CanonicalFinancialResult | null = null;
  if (input.approvedMeasure) {
    budgetSummary = computeCanonicalFinancialResult(
      input.accounts.map((account) => ({
        amountMinor: input.approvedMeasure!.valuesByAccountId.get(account.id) ?? 0,
        canonicalSemantic: account.canonicalSemantic,
      })),
    );
  }

  const fullYearVarianceSupported =
    input.measurementMode === "FULL_YEAR" && input.approvedMeasure !== null;

  const accounts: AccountPeriodicMetrics[] = input.accounts.map((account) => {
    const approvedBudgetMinor =
      input.approvedMeasure?.valuesByAccountId.get(account.id) ?? null;
    const fullYearActualMinor = mapActualMinor(fullYearTotals, account.id);
    const fullYearVariance =
      input.measurementMode === "FULL_YEAR"
        ? computeAccountVarianceMetrics({
            canonicalSemantic: account.canonicalSemantic,
            approvedBudgetMinor,
            actualMinor: fullYearActualMinor,
          })
        : null;

    return {
      accountId: account.id,
      accountName: account.name,
      canonicalSemantic: account.canonicalSemantic,
      lifecycle: account.lifecycle,
      approvedBudgetMinor,
      periodActualMinor: mapActualMinor(periodTotals, account.id),
      ytdActualMinor: mapActualMinor(ytdTotals, account.id),
      fullYearActualMinor,
      fullYearVariance,
    };
  });

  return {
    measurementMode: input.measurementMode,
    periodSummary,
    ytdSummary,
    fullYearActualSummary,
    budgetSummary,
    approvedBudgetVersionId: input.approvedMeasure?.budgetVersionId ?? null,
    periodBudgetVarianceSupported: false,
    ytdBudgetVarianceSupported: false,
    fullYearVarianceSupported,
    accounts,
  };
}
