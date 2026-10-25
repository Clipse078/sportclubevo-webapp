/**
 * FIN-04E-07R4 — locale-aware movement chart accessible descriptions.
 */

import type { FinanceTimingVisualEventMarker } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import { parseFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";

function formatLongDate(iso: string, locale: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatLongMonth(iso: string, locale: string): string {
  const [year, month] = iso.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function buildFinanceForecastMovementAccessibleTimingPhrase(input: {
  marker: FinanceTimingVisualEventMarker;
  locale: string;
  exactTemplate: (date: string) => string;
  monthTemplate: (month: string) => string;
  rangeTemplate: (start: string, end: string) => string;
}): string {
  const { marker, locale } = input;
  if (marker.interval.kind === "EXACT_DATE") {
    return input.exactTemplate(formatLongDate(marker.interval.startDateIso, locale));
  }
  if (marker.interval.kind === "MONTH") {
    return input.monthTemplate(formatLongMonth(marker.interval.startDateIso, locale));
  }
  return input.rangeTemplate(
    formatLongDate(marker.interval.startDateIso, locale),
    formatLongDate(marker.interval.endDateIso, locale),
  );
}

/** Deterministic month span check — January interval must not collapse to day 1 anchor only. */
export function financeForecastMovementMonthIntervalEndIso(monthStartIso: string): string {
  const start = parseFinanceCalendarDateIso(monthStartIso);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return end.toISOString().slice(0, 10);
}
