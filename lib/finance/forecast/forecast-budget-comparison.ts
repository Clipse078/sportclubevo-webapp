import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import type { VarianceFavorability } from "@/lib/finance/actual/variance-semantics";
import { computeVariancePercent } from "@/lib/finance/actual/variance-semantics";

export type ForecastBudgetComparisonMetrics = {
  approvedBudgetMinor: number | null;
  forecastMinor: number | null;
  hasApprovedBudget: boolean;
  hasForecast: boolean;
  rawForecastDeltaMinor: number | null;
  favorabilityMinor: number | null;
  favorability: VarianceFavorability | null;
  deltaPercent: number | null;
};

function resolveFavorability(favorabilityMinor: number): VarianceFavorability {
  if (favorabilityMinor === 0) return "ON_PLAN";
  return favorabilityMinor > 0 ? "FAVORABLE" : "UNFAVORABLE";
}

/**
 * Forecast vs approved budget (FIN-04A, annual account grain):
 * rawForecastDelta = forecast − budget
 * INCOME favorability = rawForecastDelta
 * EXPENSE favorability = budget − forecast
 */
export function computeForecastBudgetComparisonMetrics(input: {
  canonicalSemantic: "INCOME" | "EXPENSE";
  approvedBudgetMinor: number | null;
  forecastMinor: number | null;
}): ForecastBudgetComparisonMetrics {
  const hasApprovedBudget = input.approvedBudgetMinor !== null;
  const hasForecast = input.forecastMinor !== null;

  if (!hasApprovedBudget || !hasForecast) {
    return {
      approvedBudgetMinor: hasApprovedBudget ? input.approvedBudgetMinor : null,
      forecastMinor: hasForecast ? input.forecastMinor : null,
      hasApprovedBudget,
      hasForecast,
      rawForecastDeltaMinor: null,
      favorabilityMinor: null,
      favorability: null,
      deltaPercent: null,
    };
  }

  const budget = input.approvedBudgetMinor!;
  const forecast = input.forecastMinor!;
  assertSafeAmountMinor(budget);
  assertSafeAmountMinor(forecast);

  const rawForecastDeltaMinor = forecast - budget;
  const favorabilityMinor =
    input.canonicalSemantic === "INCOME" ? rawForecastDeltaMinor : budget - forecast;

  return {
    approvedBudgetMinor: budget,
    forecastMinor: forecast,
    hasApprovedBudget: true,
    hasForecast: true,
    rawForecastDeltaMinor,
    favorabilityMinor,
    favorability: resolveFavorability(favorabilityMinor),
    deltaPercent: computeVariancePercent(rawForecastDeltaMinor, budget),
  };
}
