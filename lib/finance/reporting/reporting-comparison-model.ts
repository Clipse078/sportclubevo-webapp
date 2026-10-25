/**
 * FIN-05B — presentation-neutral management reporting comparison model.
 */

import type { VarianceFavorability } from "@/lib/finance/actual/variance-semantics";

/** Supported FIN-05B comparison pairs (annual grain unless noted). */
export const FINANCE_REPORTING_COMPARISON_PAIRS = [
  "ACTUAL_VS_APPROVED_BUDGET",
  "CURRENT_FORECAST_VS_APPROVED_BUDGET",
] as const;

export type FinanceReportingComparisonPair =
  (typeof FINANCE_REPORTING_COMPARISON_PAIRS)[number];

/**
 * Explicitly unsupported in FIN-05B — mixed grain (YTD actual vs annual forecast)
 * is misleading without aligned period semantics.
 */
export const FINANCE_REPORTING_UNSUPPORTED_COMPARISONS = [
  "ACTUAL_VS_CURRENT_FORECAST",
  "ACTUAL_YTD_VS_ANNUAL_APPROVED_BUDGET",
  "ACTUAL_YTD_VS_ANNUAL_CURRENT_FORECAST",
] as const;

export type FinanceReportingUnsupportedComparison =
  (typeof FINANCE_REPORTING_UNSUPPORTED_COMPARISONS)[number];

export type FinanceReportingComparisonGrain =
  | "ANNUAL_FULL_YEAR"
  | "ACTUAL_YTD_WITH_EXPLICIT_CUTOFF";

export type FinanceReportingComparisonAvailability =
  | "AVAILABLE"
  | "BASELINE_MISSING"
  | "COMPARISON_MISSING"
  | "BOTH_MISSING"
  | "PERIOD_MISMATCH"
  | "UNSUPPORTED"
  | "NO_BASE_CURRENCY"
  | "NO_FINANCE_YEAR"
  | "NO_STRUCTURE"
  | "NO_APPROVED_BUDGET"
  | "NO_ACTUAL"
  | "NO_CURRENT_FORECAST"
  | "PARTIAL_SOURCE_AVAILABILITY";

export type FinanceReportingComparisonSlice = {
  availability: FinanceReportingComparisonAvailability;
  baselineMinor: number | null;
  comparisonMinor: number | null;
  rawDeltaMinor: number | null;
  variancePercent: number | null;
  favorability: VarianceFavorability | null;
  /** Absolute magnitude for ranking — null when variance unavailable. */
  absoluteVarianceMagnitudeMinor: number | null;
};

export function resolveComparisonAvailabilityFromSides(input: {
  hasBaseline: boolean;
  hasComparison: boolean;
  periodMismatch?: boolean;
  unsupported?: boolean;
}): FinanceReportingComparisonAvailability {
  if (input.unsupported) return "UNSUPPORTED";
  if (input.periodMismatch) return "PERIOD_MISMATCH";
  if (!input.hasBaseline && !input.hasComparison) return "BOTH_MISSING";
  if (!input.hasBaseline) return "BASELINE_MISSING";
  if (!input.hasComparison) return "COMPARISON_MISSING";
  return "AVAILABLE";
}

export function absoluteVarianceMagnitude(rawDeltaMinor: number | null): number | null {
  if (rawDeltaMinor === null) return null;
  return Math.abs(rawDeltaMinor);
}
