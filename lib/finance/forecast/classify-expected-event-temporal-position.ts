/**
 * FIN-04E-02 — classify expected event timing relative to an explicit actuals-through cutoff.
 */

import { parseFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import type { ExpectedFinancialEventForReconciliation } from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";

export const EXPECTED_EVENT_TEMPORAL_POSITION = [
  "FUTURE_TIMED",
  "AMBIGUOUS_AT_CUTOFF",
  "NOT_FUTURE",
] as const;

export type ExpectedEventTemporalPosition =
  (typeof EXPECTED_EVENT_TEMPORAL_POSITION)[number];

function utcDayMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function monthKey(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function requireIso(value: string | null | undefined, label: string): Date {
  if (!value) {
    throw new Error(`FINANCE_EXPECTED_EVENT_INVALID_TIMING:${label}`);
  }
  return parseFinanceCalendarDateIso(value);
}

export function classifyExpectedEventTemporalPosition(
  actualsThroughDateIso: string,
  event: ExpectedFinancialEventForReconciliation,
): ExpectedEventTemporalPosition {
  const cutoff = parseFinanceCalendarDateIso(actualsThroughDateIso);
  const cutoffDay = utcDayMs(cutoff);

  if (event.timingPrecision === "EXACT_DATE") {
    const expected = requireIso(event.expectedDateIso, "expectedDate");
    return utcDayMs(expected) > cutoffDay ? "FUTURE_TIMED" : "NOT_FUTURE";
  }

  if (event.timingPrecision === "MONTH") {
    const monthStart = requireIso(event.expectedMonthStartIso, "expectedMonthStart");
    const cutoffMonth = monthKey(cutoff);
    const eventMonth = monthKey(monthStart);
    if (eventMonth > cutoffMonth) return "FUTURE_TIMED";
    if (eventMonth < cutoffMonth) return "NOT_FUTURE";
    return "AMBIGUOUS_AT_CUTOFF";
  }

  const rangeStart = requireIso(event.rangeStartDateIso, "rangeStartDate");
  const rangeEnd = requireIso(event.rangeEndDateIso, "rangeEndDate");
  const startDay = utcDayMs(rangeStart);
  const endDay = utcDayMs(rangeEnd);

  if (endDay < cutoffDay) return "NOT_FUTURE";
  if (startDay > cutoffDay) return "FUTURE_TIMED";
  return "AMBIGUOUS_AT_CUTOFF";
}
