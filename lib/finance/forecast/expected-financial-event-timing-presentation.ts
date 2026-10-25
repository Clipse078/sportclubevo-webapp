/**
 * FIN-04E-05 — tenant-facing timing display (semantic precision preserved).
 */

import type { ExpectedFinancialEventTimingPrecisionPersisted } from "@/lib/finance/forecast/expected-financial-event-persistence-validation";

export type ExpectedEventTimingDisplayInput = {
  timingPrecision: ExpectedFinancialEventTimingPrecisionPersisted;
  expectedDateIso: string | null;
  expectedMonthStartIso: string | null;
  rangeStartDateIso: string | null;
  rangeEndDateIso: string | null;
};

function formatExactCalendarDay(iso: string, locale: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatMonthYear(iso: string, locale: string): string {
  const [year, month] = iso.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Semantic timing label — never exposes sort surrogates as exact dates. */
export function formatExpectedFinancialEventTimingLabel(
  input: ExpectedEventTimingDisplayInput,
  locale: string,
): string {
  if (input.timingPrecision === "EXACT_DATE" && input.expectedDateIso) {
    return formatExactCalendarDay(input.expectedDateIso, locale);
  }
  if (input.timingPrecision === "MONTH" && input.expectedMonthStartIso) {
    return formatMonthYear(input.expectedMonthStartIso, locale);
  }
  if (
    input.timingPrecision === "DATE_RANGE" &&
    input.rangeStartDateIso &&
    input.rangeEndDateIso
  ) {
    return `${formatExactCalendarDay(input.rangeStartDateIso, locale)}–${formatExactCalendarDay(input.rangeEndDateIso, locale)}`;
  }
  return "—";
}

export type ExpectedEventTimingUiKind = "EXACT_DATE" | "MONTH" | "DATE_RANGE";

export function monthInputValueFromIso(expectedMonthStartIso: string): string {
  return expectedMonthStartIso.slice(0, 7);
}

export function expectedMonthStartIsoFromMonthInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return `${match[1]}-${match[2]}-01`;
}

export function isExpectedEventTimingAfterFinanceYearEnd(input: {
  financeYearEndDateIso: string;
  timing: ExpectedEventTimingDisplayInput;
}): boolean {
  const endMs = Date.parse(`${input.financeYearEndDateIso}T00:00:00.000Z`);
  if (input.timing.timingPrecision === "EXACT_DATE" && input.timing.expectedDateIso) {
    return Date.parse(`${input.timing.expectedDateIso}T00:00:00.000Z`) > endMs;
  }
  if (input.timing.timingPrecision === "MONTH" && input.timing.expectedMonthStartIso) {
    return Date.parse(`${input.timing.expectedMonthStartIso}T00:00:00.000Z`) > endMs;
  }
  if (input.timing.timingPrecision === "DATE_RANGE" && input.timing.rangeStartDateIso) {
    return Date.parse(`${input.timing.rangeStartDateIso}T00:00:00.000Z`) > endMs;
  }
  return false;
}

export function financeForecastTimingAccountNeedsAttention(input: {
  reconciliation: {
    state: string;
    ambiguousTimingExpectationMinor: number;
    unscheduledRemainderMinor: number | null;
    overallocatedAmountMinor: number | null;
    actualExceedsAnnualForecastAmountMinor: number | null;
  };
  expectedEventCount: number;
}): boolean {
  const r = input.reconciliation;
  if (r.state === "OVERALLOCATED") return true;
  if (r.state === "FORECAST_LINE_ABSENT" && input.expectedEventCount > 0) return true;
  if (r.ambiguousTimingExpectationMinor > 0) return true;
  if ((r.actualExceedsAnnualForecastAmountMinor ?? 0) > 0) return true;
  if ((r.unscheduledRemainderMinor ?? 0) > 0) return true;
  return false;
}
