import type { FinanceForecastHistoryEntry } from "@/lib/finance/forecast/forecast-history-read-model";

export type ForecastEvolutionChartPoint = {
  forecastVersionId: string;
  versionNumber: number;
  label: string;
  isCurrent: boolean;
  resultMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  asOfDate: string | null;
  revisionSourceLabel: string | null;
  revisionLabel: string | null;
};

/**
 * FIN-04C-05R2 — formal forecast revision progression (not monthly phasing).
 * Uses stored history amounts only; categorical order = chronological revisions.
 */
export function buildForecastEvolutionChartPoints(
  entriesChronological: readonly FinanceForecastHistoryEntry[],
): ForecastEvolutionChartPoint[] {
  return entriesChronological.map((entry) => ({
    forecastVersionId: entry.forecastVersionId,
    versionNumber: entry.versionNumber,
    label: entry.isCurrent
      ? entry.presentation.displayTitle
      : entry.presentation.displayTitle,
    isCurrent: entry.isCurrent,
    resultMinor: entry.resultMinor,
    incomeMinor: entry.totalIncomeMinor,
    expenseMinor: entry.totalExpenseMinor,
    asOfDate: entry.asOfDate,
    revisionSourceLabel: entry.presentation.revisionSourceLabel,
    revisionLabel: entry.revisionLabel,
  }));
}

export function selectMeaningfulForecastChangeDrivers<
  T extends { deltaMinor: number; financialAccountId: string },
>(rows: readonly T[], limit = 5): T[] {
  return rows.filter((row) => row.deltaMinor !== 0).slice(0, limit);
}
