/**
 * FIN-04E-06 — classify future expected-event timing relative to an effective-from business date.
 * Does not invent day-level precision for MONTH or DATE_RANGE.
 */

import { parseFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import type { ExpectedFinancialEventForReconciliation } from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";

export const EXPECTED_EVENT_EFFECTIVE_DATE_APPLICABILITY = [
  "BEFORE_EFFECTIVE_DATE",
  "AFTER_EFFECTIVE_DATE",
  "AMBIGUOUS_AT_EFFECTIVE_DATE",
] as const;

export type ExpectedEventEffectiveDateApplicability =
  (typeof EXPECTED_EVENT_EFFECTIVE_DATE_APPLICABILITY)[number];

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

export function classifyExpectedEventEffectiveDateApplicability(
  effectiveFromDateIso: string,
  event: ExpectedFinancialEventForReconciliation,
): ExpectedEventEffectiveDateApplicability {
  const effective = parseFinanceCalendarDateIso(effectiveFromDateIso);
  const effectiveDay = utcDayMs(effective);

  if (event.timingPrecision === "EXACT_DATE") {
    const expected = requireIso(event.expectedDateIso, "expectedDate");
    const expectedDay = utcDayMs(expected);
    return expectedDay < effectiveDay ? "BEFORE_EFFECTIVE_DATE" : "AFTER_EFFECTIVE_DATE";
  }

  if (event.timingPrecision === "MONTH") {
    const monthStart = requireIso(event.expectedMonthStartIso, "expectedMonthStart");
    const effectiveMonth = monthKey(effective);
    const eventMonth = monthKey(monthStart);
    if (eventMonth < effectiveMonth) return "BEFORE_EFFECTIVE_DATE";
    if (eventMonth > effectiveMonth) return "AFTER_EFFECTIVE_DATE";
    if (effective.getUTCDate() === 1) {
      return "AFTER_EFFECTIVE_DATE";
    }
    return "AMBIGUOUS_AT_EFFECTIVE_DATE";
  }

  const rangeStart = requireIso(event.rangeStartDateIso, "rangeStartDate");
  const rangeEnd = requireIso(event.rangeEndDateIso, "rangeEndDate");
  const startDay = utcDayMs(rangeStart);
  const endDay = utcDayMs(rangeEnd);

  if (endDay < effectiveDay) return "BEFORE_EFFECTIVE_DATE";
  if (startDay >= effectiveDay) return "AFTER_EFFECTIVE_DATE";
  return "AMBIGUOUS_AT_EFFECTIVE_DATE";
}
