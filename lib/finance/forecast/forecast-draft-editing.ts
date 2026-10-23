import type { ForecastWorkspaceSnapshot } from "@/lib/finance/forecast/forecast-presentation";
import { forecastTotalsFromRows } from "@/lib/finance/forecast/forecast-presentation";

export type ForecastDraftAmounts = Record<string, number | null>;

export function buildForecastDraftAmounts(
  rows: ForecastWorkspaceSnapshot["rows"],
): ForecastDraftAmounts {
  const draft: ForecastDraftAmounts = {};
  for (const row of rows) {
    draft[row.accountId] = row.amountMinor;
  }
  return draft;
}

export function mergeForecastDraftAmount(
  draft: ForecastDraftAmounts,
  accountId: string,
  amountMinor: number | null,
): ForecastDraftAmounts {
  return { ...draft, [accountId]: amountMinor };
}

export function forecastRowsForTotals(
  rows: ForecastWorkspaceSnapshot["rows"],
  draft: ForecastDraftAmounts,
) {
  return rows.map((row) => ({
    semantic: row.semantic,
    amountMinor: Object.prototype.hasOwnProperty.call(draft, row.accountId)
      ? draft[row.accountId]!
      : row.amountMinor,
  }));
}

export function forecastTotalsFromDraft(
  rows: ForecastWorkspaceSnapshot["rows"],
  draft: ForecastDraftAmounts,
) {
  return forecastTotalsFromRows(forecastRowsForTotals(rows, draft));
}

export function isStaleForecastSaveResult(
  accountId: string,
  saveGeneration: number,
  latestGenerationByAccount: ReadonlyMap<string, number>,
): boolean {
  return (latestGenerationByAccount.get(accountId) ?? 0) !== saveGeneration;
}
