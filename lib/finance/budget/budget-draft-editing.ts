import type { BudgetWorkspaceSnapshot } from "@/lib/finance/budget/budget-presentation";
import { budgetTotalsFromRows } from "@/lib/finance/budget/budget-presentation";

export type BudgetDraftAmounts = Record<string, number | null>;

export function buildBudgetDraftAmounts(
  rows: BudgetWorkspaceSnapshot["rows"],
): BudgetDraftAmounts {
  const draft: BudgetDraftAmounts = {};
  for (const row of rows) {
    draft[row.accountId] = row.amountMinor;
  }
  return draft;
}

export function mergeBudgetDraftAmount(
  draft: BudgetDraftAmounts,
  accountId: string,
  amountMinor: number | null,
): BudgetDraftAmounts {
  return { ...draft, [accountId]: amountMinor };
}

export function budgetRowsForTotals(
  rows: BudgetWorkspaceSnapshot["rows"],
  draft: BudgetDraftAmounts,
): Array<{ amountMinor: number | null; semantic: BudgetWorkspaceSnapshot["rows"][number]["semantic"] }> {
  return rows.map((row) => ({
    semantic: row.semantic,
    amountMinor: Object.prototype.hasOwnProperty.call(draft, row.accountId)
      ? draft[row.accountId]!
      : row.amountMinor,
  }));
}

export function budgetTotalsFromDraft(
  rows: BudgetWorkspaceSnapshot["rows"],
  draft: BudgetDraftAmounts,
) {
  return budgetTotalsFromRows(budgetRowsForTotals(rows, draft));
}

export function shouldAcceptServerBudgetDraft(
  input: {
    versionId: string | null;
    syncedVersionId: string | null;
    dirtyAccountIds: ReadonlySet<string>;
  },
): boolean {
  if (!input.versionId) return true;
  if (input.versionId !== input.syncedVersionId) return true;
  return input.dirtyAccountIds.size === 0;
}

export function isStaleBudgetSaveResult(
  accountId: string,
  saveGeneration: number,
  latestGenerationByAccount: ReadonlyMap<string, number>,
): boolean {
  return (latestGenerationByAccount.get(accountId) ?? 0) !== saveGeneration;
}
