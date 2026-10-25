/**
 * FIN-05D-R2 — direct labels for overview event timeline (presentation).
 */

import {
  formatExpectedFinancialEventTimingLabel,
  type ExpectedEventTimingDisplayInput,
} from "@/lib/finance/forecast/expected-financial-event-timing-presentation";
import type { FinanceOverviewEventTimelineEntry } from "@/lib/finance/presentation/build-finance-overview-event-timeline-model";

export function financeOverviewEventTimelineTimingInput(
  entry: FinanceOverviewEventTimelineEntry,
): ExpectedEventTimingDisplayInput {
  if (entry.visualKind === "EXACT_DATE") {
    return {
      timingPrecision: "EXACT_DATE",
      expectedDateIso: entry.startDateIso,
      expectedMonthStartIso: null,
      rangeStartDateIso: null,
      rangeEndDateIso: null,
    };
  }
  if (entry.visualKind === "MONTH") {
    return {
      timingPrecision: "MONTH",
      expectedDateIso: null,
      expectedMonthStartIso: entry.startDateIso,
      rangeStartDateIso: null,
      rangeEndDateIso: null,
    };
  }
  return {
    timingPrecision: "DATE_RANGE",
    expectedDateIso: null,
    expectedMonthStartIso: null,
    rangeStartDateIso: entry.startDateIso,
    rangeEndDateIso: entry.endDateIso,
  };
}

export function formatFinanceOverviewEventTimelineWhenLabel(
  entry: FinanceOverviewEventTimelineEntry,
  locale: string,
): string {
  if (entry.visualKind === "EXACT_DATE") {
    const [y, m, d] = entry.startDateIso.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  }
  if (entry.visualKind === "DATE_RANGE") {
    return formatHumanReadableDateRange(entry.startDateIso, entry.endDateIso, locale);
  }
  const [y, m] = entry.startDateIso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function formatHumanReadableDateRange(startIso: string, endIso: string, locale: string): string {
  const [ys, ms, ds] = startIso.split("-").map(Number);
  const [ye, me, de] = endIso.split("-").map(Number);
  if (ys === ye && ms === me) {
    const month = new Intl.DateTimeFormat(locale, {
      month: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(ys, ms - 1, 1)));
    if (locale.startsWith("de")) {
      return `${ds}.–${de}. ${month}`;
    }
    return `${ds}–${de} ${month}`;
  }
  return formatExpectedFinancialEventTimingLabel(
    {
      timingPrecision: "DATE_RANGE",
      expectedDateIso: null,
      expectedMonthStartIso: null,
      rangeStartDateIso: startIso,
      rangeEndDateIso: endIso,
    },
    locale,
  );
}

export function formatFinanceOverviewEventTimelineAxisMonth(
  monthIndex: number,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(2020, monthIndex, 1)))
    .replace(/\./g, "")
    .toUpperCase();
}
