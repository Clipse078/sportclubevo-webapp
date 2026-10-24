import { computeForecastBudgetComparisonMetrics } from "@/lib/finance/forecast/forecast-budget-comparison";
import type { FinanceForecastAccountComparisonRowEnriched } from "@/lib/finance/forecast/forecast-history-read-model";
import { isForecastComparisonMovementNeutral } from "@/lib/finance/forecast/forecast-evolution-presentation";
import type { FinanceForecastVersionComparisonSummary } from "@/lib/finance/forecast/forecast-revision-comparison";
import { financeVarianceFavorabilityLabelKey } from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import type { VarianceFavorability } from "@/lib/finance/actual/variance-semantics";

export type ForecastBudgetDriverRow = FinanceForecastAccountComparisonRowEnriched & {
  favorability: VarianceFavorability | null;
};

/** Bounded budget drivers sorted by meaningful absolute variance (caller may slice). */
export function enrichForecastBudgetComparisonDrivers(
  rows: readonly FinanceForecastAccountComparisonRowEnriched[],
): ForecastBudgetDriverRow[] {
  return rows
    .filter((row) => row.deltaMinor !== 0)
    .map((row) => {
      const metrics = computeForecastBudgetComparisonMetrics({
        canonicalSemantic: row.accountType,
        approvedBudgetMinor: row.baseAmountMinor,
        forecastMinor: row.comparisonAmountMinor,
      });
      return {
        ...row,
        favorability: metrics.favorability,
      };
    });
}

export function forecastBudgetDriverFavorabilityLabelKey(
  favorability: VarianceFavorability | null,
): ReturnType<typeof financeVarianceFavorabilityLabelKey> | null {
  if (!favorability) return null;
  return financeVarianceFavorabilityLabelKey(favorability);
}

export function shouldShowForecastRevisionMovementSummary(
  summary: FinanceForecastVersionComparisonSummary,
): boolean {
  return !isForecastComparisonMovementNeutral(summary);
}

export { isForecastComparisonMovementNeutral };
