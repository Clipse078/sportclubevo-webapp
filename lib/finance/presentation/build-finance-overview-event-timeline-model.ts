/**
 * FIN-05D-R1 — compact executive expected-event timeline (presentation only).
 * Discrete expected movements over real time — not liquidity / running cash balance (FIN-09).
 */

import {
  timelinePositionFraction,
  timelineSpanFractions,
} from "@/lib/finance/forecast/finance-forecast-timing-visual-layout";
import type {
  FinanceForecastTimingVisualModel,
  FinanceTimingVisualEventMarker,
} from "@/lib/finance/forecast/finance-forecast-timing-visual-types";

export type FinanceOverviewEventTimelineEntry = {
  eventId: string;
  sortKeyIso: string;
  startDateIso: string;
  endDateIso: string;
  visualKind: "EXACT_DATE" | "MONTH" | "DATE_RANGE";
  direction: "INCOME" | "EXPENSE";
  amountMinor: number;
  accountName: string;
  /** Normalized 0–1 within the visual window. */
  xStartFraction: number;
  xEndFraction: number;
  isAfterFinanceYearEnd: boolean;
};

export type FinanceOverviewEventTimelineAxisTick = {
  dateIso: string;
  xFraction: number;
  /** Short month label for axis (locale applied in UI). */
  monthIndex: number;
  year: number;
};

export type FinanceOverviewEventTimelineModel = {
  windowStartDateIso: string;
  windowEndDateIso: string;
  financeYearEndDateIso: string | null;
  financeYearEndFraction: number | null;
  entries: FinanceOverviewEventTimelineEntry[];
  axisTicks: FinanceOverviewEventTimelineAxisTick[];
};

function utcDayMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00.000Z`);
}

function markerSortKey(marker: FinanceTimingVisualEventMarker): string {
  return marker.interval.startDateIso;
}

function buildAxisTicks(input: {
  windowStartDateIso: string;
  windowEndDateIso: string;
  maxTicks: number;
}): FinanceOverviewEventTimelineAxisTick[] {
  const startMs = utcDayMs(input.windowStartDateIso);
  const endMs = utcDayMs(input.windowEndDateIso);
  const spanDays = Math.max(1, Math.round((endMs - startMs) / 86_400_000));
  const target = Math.min(input.maxTicks, Math.max(3, Math.ceil(spanDays / 30)));

  const ticks: FinanceOverviewEventTimelineAxisTick[] = [];
  const start = new Date(startMs);
  let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
  const end = endMs;

  while (cursor <= end && ticks.length < target + 6) {
    const iso = new Date(cursor).toISOString().slice(0, 10);
    const fraction = timelinePositionFraction({
      dateIso: iso,
      windowStartDateIso: input.windowStartDateIso,
      windowEndDateIso: input.windowEndDateIso,
    });
    const d = new Date(cursor);
    ticks.push({
      dateIso: iso,
      xFraction: fraction,
      monthIndex: d.getUTCMonth(),
      year: d.getUTCFullYear(),
    });
    cursor = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }

  if (ticks.length <= target) {
    return ticks;
  }

  const step = Math.ceil(ticks.length / target);
  return ticks.filter((_, index) => index % step === 0 || index === ticks.length - 1);
}

export function buildFinanceOverviewEventTimelineModel(
  visual: FinanceForecastTimingVisualModel,
): FinanceOverviewEventTimelineModel {
  const { window } = visual;
  const windowStartDateIso = window.startDateIso;
  const windowEndDateIso = window.endDateIso;

  const sorted = [...visual.markers].sort((a, b) => {
    const diff = utcDayMs(markerSortKey(a)) - utcDayMs(markerSortKey(b));
    if (diff !== 0) return diff;
    return a.eventId.localeCompare(b.eventId);
  });

  const entries: FinanceOverviewEventTimelineEntry[] = sorted.map((marker) => {
    const span = timelineSpanFractions({
      startDateIso: marker.interval.startDateIso,
      endDateIso: marker.interval.endDateIso,
      windowStartDateIso,
      windowEndDateIso,
    });
    return {
      eventId: marker.eventId,
      sortKeyIso: marker.interval.startDateIso,
      startDateIso: marker.interval.startDateIso,
      endDateIso: marker.interval.endDateIso,
      visualKind: marker.interval.kind,
      direction: marker.accountType,
      amountMinor: marker.expectedAmountMinor,
      accountName: marker.accountName,
      xStartFraction: span.left,
      xEndFraction: Math.min(1, span.left + span.width),
      isAfterFinanceYearEnd: marker.isAfterFinanceYearEnd,
    };
  });

  const financeYearEndDateIso = window.financeYearEndDateIso;
  const financeYearEndFraction =
    financeYearEndDateIso &&
    financeYearEndDateIso >= windowStartDateIso &&
    financeYearEndDateIso <= windowEndDateIso
      ? timelinePositionFraction({
          dateIso: financeYearEndDateIso,
          windowStartDateIso,
          windowEndDateIso,
        })
      : null;

  return {
    windowStartDateIso,
    windowEndDateIso,
    financeYearEndDateIso,
    financeYearEndFraction,
    entries,
    axisTicks: buildAxisTicks({
      windowStartDateIso,
      windowEndDateIso,
      maxTicks: 6,
    }),
  };
}
