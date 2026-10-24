import {
  formatFinanceCalendarDateIso,
  isFinanceCalendarDateWithinInclusiveRange,
} from "@/lib/finance/dates/finance-calendar-date";

/**
 * UI recommendation only — not persisted until formalization succeeds.
 * Prefers today's UTC calendar date when it lies inside the finance year.
 */
export function recommendFormalReforecastAsOfDate(financeYear: {
  startDate: Date;
  endDate: Date;
  now?: Date;
}): string | null {
  const now = financeYear.now ?? new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (
    !isFinanceCalendarDateWithinInclusiveRange(
      today,
      financeYear.startDate,
      financeYear.endDate,
    )
  ) {
    return null;
  }
  return formatFinanceCalendarDateIso(today);
}
