import type { AccountPeriodicMetrics } from "@/lib/finance/actual/periodic-account-read-model";
import type { FinanceMeasurementPeriod } from "@/lib/finance/actual/finance-measurement-period";
import type { CanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";

export type ManagementReviewSignalKind =
  | "PERIOD_HAS_ACTIVITY"
  | "PERIOD_NO_ACTIVITY"
  | "ACCOUNTS_WITH_ACTUAL_NO_BUDGET"
  | "BUDGET_ACCOUNTS_WITHOUT_ACTUAL"
  | "YTD_RESULT_NEGATIVE"
  | "YTD_RESULT_POSITIVE";

export type ManagementReviewSignal = {
  kind: ManagementReviewSignalKind;
  accountIds?: string[];
};

export function deriveManagementReviewSignals(input: {
  measurementPeriod: FinanceMeasurementPeriod;
  periodSummary: CanonicalFinancialResult;
  ytdSummary: CanonicalFinancialResult;
  accounts: ReadonlyArray<AccountPeriodicMetrics>;
}): ManagementReviewSignal[] {
  const signals: ManagementReviewSignal[] = [];
  const periodTotal =
    input.periodSummary.incomeMinor + input.periodSummary.expenseMinor;

  if (periodTotal > 0) {
    signals.push({ kind: "PERIOD_HAS_ACTIVITY" });
  } else {
    signals.push({ kind: "PERIOD_NO_ACTIVITY" });
  }

  const actualNoBudget = input.accounts
    .filter((row) => row.periodActualMinor !== null && row.periodActualMinor > 0)
    .filter((row) => row.approvedBudgetMinor === null)
    .map((row) => row.accountId);
  if (actualNoBudget.length > 0) {
    signals.push({ kind: "ACCOUNTS_WITH_ACTUAL_NO_BUDGET", accountIds: actualNoBudget });
  }

  const budgetNoActual = input.accounts
    .filter((row) => row.approvedBudgetMinor !== null && row.approvedBudgetMinor > 0)
    .filter((row) => (row.ytdActualMinor ?? 0) === 0)
    .map((row) => row.accountId);
  if (budgetNoActual.length > 0) {
    signals.push({ kind: "BUDGET_ACCOUNTS_WITHOUT_ACTUAL", accountIds: budgetNoActual });
  }

  if (
    input.measurementPeriod.mode !== "FULL_YEAR" &&
    input.ytdSummary.resultMinor < 0
  ) {
    signals.push({ kind: "YTD_RESULT_NEGATIVE" });
  } else if (
    input.measurementPeriod.mode !== "FULL_YEAR" &&
    input.ytdSummary.resultMinor > 0
  ) {
    signals.push({ kind: "YTD_RESULT_POSITIVE" });
  }

  return signals;
}
