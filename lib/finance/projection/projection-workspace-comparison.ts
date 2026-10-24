/**
 * Neutral SCE projection vs current forecast comparison (projection − forecast).
 * No favorability semantics.
 */
export function computeProjectionForecastDeltaMinor(
  projectedAmountMinor: number | null,
  forecastAmountMinor: number | null,
): number | null {
  if (projectedAmountMinor === null || forecastAmountMinor === null) {
    return null;
  }
  return projectedAmountMinor - forecastAmountMinor;
}
