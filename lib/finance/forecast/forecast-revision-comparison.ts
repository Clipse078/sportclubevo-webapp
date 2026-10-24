import { assertSafeAmountMinor } from "@/lib/finance/money-types";

/**
 * Neutral forecast revision delta (FIN-04C):
 * change = newForecast − previousForecast
 *
 * Favorability for income/expense remains a presentation concern — not assigned here.
 */
export type ForecastRevisionComparisonMetrics = {
  previousForecastMinor: number | null;
  newForecastMinor: number | null;
  hasPrevious: boolean;
  hasNew: boolean;
  rawRevisionDeltaMinor: number | null;
};

export function computeForecastRevisionComparisonMetrics(input: {
  previousForecastMinor: number | null;
  newForecastMinor: number | null;
}): ForecastRevisionComparisonMetrics {
  const hasPrevious = input.previousForecastMinor !== null;
  const hasNew = input.newForecastMinor !== null;

  if (!hasPrevious || !hasNew) {
    return {
      previousForecastMinor: hasPrevious ? input.previousForecastMinor : null,
      newForecastMinor: hasNew ? input.newForecastMinor : null,
      hasPrevious,
      hasNew,
      rawRevisionDeltaMinor: null,
    };
  }

  const previous = input.previousForecastMinor!;
  const next = input.newForecastMinor!;
  assertSafeAmountMinor(previous);
  assertSafeAmountMinor(next);

  return {
    previousForecastMinor: previous,
    newForecastMinor: next,
    hasPrevious: true,
    hasNew: true,
    rawRevisionDeltaMinor: next - previous,
  };
}
