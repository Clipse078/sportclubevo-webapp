import type { AccountPeriodicMetrics } from "@/lib/finance/actual/periodic-account-read-model";
export type ManagementReviewSignalKind =
  | "ACCOUNTS_WITH_ACTUAL_NO_BUDGET"
  | "BUDGET_ACCOUNTS_WITHOUT_ACTUAL";

export type ManagementReviewSignal = {
  kind: ManagementReviewSignalKind;
  accountIds?: string[];
};

/**
 * Only signals that add decision value — omit “data exists” diagnostics.
 */
export function deriveManagementReviewSignals(input: {
  accounts: ReadonlyArray<AccountPeriodicMetrics>;
}): ManagementReviewSignal[] {
  const signals: ManagementReviewSignal[] = [];

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

  return signals;
}
