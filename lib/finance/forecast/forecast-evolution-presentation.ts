import type { FinanceForecastHistoryEntry } from "@/lib/finance/forecast/forecast-history-read-model";
import { joinForecastMetadataTokens } from "@/lib/finance/forecast/forecast-revision-presentation";

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
  displaySubtitle: string | null;
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
    label: entry.presentation.displayTitle,
    isCurrent: entry.isCurrent,
    resultMinor: entry.resultMinor,
    incomeMinor: entry.totalIncomeMinor,
    expenseMinor: entry.totalExpenseMinor,
    asOfDate: entry.asOfDate,
    revisionSourceLabel: entry.presentation.revisionSourceLabel,
    revisionLabel: entry.revisionLabel,
    displaySubtitle: entry.presentation.displaySubtitle,
  }));
}

export function resolveForecastEvolutionPointHeadline(
  point: ForecastEvolutionChartPoint,
  currentLabel: string,
): string {
  return point.isCurrent ? currentLabel : point.label;
}

/** Compact secondary metadata under timeline points (no duplicate tokens). */
export function formatForecastEvolutionPointSecondaryMeta(input: {
  point: ForecastEvolutionChartPoint;
  asOfLine: string | null;
  versionLine: string;
}): string | null {
  const tokens: (string | null)[] = [];
  if (input.point.isCurrent && input.point.revisionLabel?.trim()) {
    tokens.push(input.point.revisionLabel.trim());
  }
  if (input.point.displaySubtitle) {
    tokens.push(input.point.displaySubtitle);
  } else {
    if (input.asOfLine) {
      tokens.push(input.asOfLine);
    }
    tokens.push(input.versionLine);
  }
  return joinForecastMetadataTokens(tokens);
}

export function selectMeaningfulForecastChangeDrivers<
  T extends { deltaMinor: number; financialAccountId: string },
>(rows: readonly T[], limit = 5): T[] {
  return rows.filter((row) => row.deltaMinor !== 0).slice(0, limit);
}

/** Headline movement summary with no income, expense, or result delta. */
export function isForecastComparisonMovementNeutral(summary: {
  incomeDeltaMinor: number;
  expenseDeltaMinor: number;
  resultDeltaMinor: number;
}): boolean {
  return (
    summary.incomeDeltaMinor === 0 &&
    summary.expenseDeltaMinor === 0 &&
    summary.resultDeltaMinor === 0
  );
}
