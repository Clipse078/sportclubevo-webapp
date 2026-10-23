import type { FinanceYearPeriod } from "@/lib/finance/actual/finance-year-membership";

export type BudgetComparisonMode = "FULL_YEAR" | "YTD";

/**
 * YTD cutoff for actual aggregation: min(referenceDate, year.endDate) when reference is in-year,
 * otherwise year end if reference is after the year, or year start if before (no YTD window yet).
 */
export function resolveYtdCutoffDate(
  year: FinanceYearPeriod,
  referenceDate: Date = new Date(),
): Date {
  const ref = referenceDate.getTime();
  const start = year.startDate.getTime();
  const end = year.endDate.getTime();
  if (ref < start) {
    return year.startDate;
  }
  if (ref > end) {
    return year.endDate;
  }
  return referenceDate;
}

export function isEffectiveDateOnOrBeforeCutoff(effectiveDate: Date, cutoff: Date): boolean {
  return effectiveDate.getTime() <= cutoff.getTime();
}

/** FIN-03A does not fabricate phased budget — YTD budget variance is intentionally unsupported. */
export const YTD_BUDGET_VARIANCE_SUPPORTED = false as const;
