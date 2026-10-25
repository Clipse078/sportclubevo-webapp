/**
 * FIN-05D-R2 — compact executive expected-event timeline (presentation only).
 * Discrete expected movements over real time — not liquidity / running cash balance (FIN-09).
 */

import {
  assignFinanceOverviewEventTimelineLanes,
  type FinanceOverviewEventTimelineLaneLayout,
} from "@/lib/finance/presentation/assign-finance-overview-event-timeline-lanes";
import {
  buildFinanceOverviewEventTimelineAxis,
  type FinanceOverviewEventTimelineAxisTick,
  type FinanceOverviewEventTimelineYearBand,
} from "@/lib/finance/presentation/finance-overview-event-timeline-axis";
import { timelineSpanFractions } from "@/lib/finance/forecast/finance-forecast-timing-visual-layout";
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
  materialityFraction: number;
  /** Normalized 0–1 within the visual window. */
  xStartFraction: number;
  xEndFraction: number;
  isAfterFinanceYearEnd: boolean;
};

export type { FinanceOverviewEventTimelineAxisTick, FinanceOverviewEventTimelineYearBand };

export type FinanceOverviewEventTimelineModel = {
  windowStartDateIso: string;
  windowEndDateIso: string;
  financeYearStartDateIso: string | null;
  financeYearEndDateIso: string | null;
  financeYearEndFraction: number | null;
  entries: FinanceOverviewEventTimelineEntry[];
  axisTicks: FinanceOverviewEventTimelineAxisTick[];
  yearBands: FinanceOverviewEventTimelineYearBand[];
  laneLayout: FinanceOverviewEventTimelineLaneLayout;
};

function utcDayMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00.000Z`);
}

function markerSortKey(marker: FinanceTimingVisualEventMarker): string {
  return marker.interval.startDateIso;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const TIMELINE_LEAD_TRIM_MIN_DAYS = 21;
const TIMELINE_FOCUS_PAD_BEFORE_DAYS = 7;

function isoFromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * FIN-05G — trim meaningless empty lead time before the first event while preserving FY context.
 * Presentation-only; does not change event temporal semantics.
 */
export function resolveFinanceOverviewEventTimelinePresentationWindow(
  visual: FinanceForecastTimingVisualModel,
): { startDateIso: string; endDateIso: string; trimmedLeadingWindow: boolean } {
  const { window, markers } = visual;
  const endDateIso = window.endDateIso;
  if (markers.length === 0) {
    return {
      startDateIso: window.startDateIso,
      endDateIso,
      trimmedLeadingWindow: false,
    };
  }

  const minEventStartMs = Math.min(
    ...markers.map((marker) => utcDayMs(marker.interval.startDateIso)),
  );
  const originalStartMs = utcDayMs(window.startDateIso);
  const leadEmptyMs = minEventStartMs - originalStartMs;
  if (leadEmptyMs < TIMELINE_LEAD_TRIM_MIN_DAYS * DAY_MS) {
    return {
      startDateIso: window.startDateIso,
      endDateIso,
      trimmedLeadingWindow: false,
    };
  }

  const fyFloorMs = window.financeYearStartDateIso
    ? utcDayMs(window.financeYearStartDateIso)
    : originalStartMs;
  const actualsFloorMs = utcDayMs(window.actualsThroughDateIso);
  const focusedStartMs = Math.max(
    fyFloorMs,
    actualsFloorMs,
    minEventStartMs - TIMELINE_FOCUS_PAD_BEFORE_DAYS * DAY_MS,
  );

  if (focusedStartMs <= originalStartMs) {
    return {
      startDateIso: window.startDateIso,
      endDateIso,
      trimmedLeadingWindow: false,
    };
  }

  return {
    startDateIso: isoFromUtcMs(focusedStartMs),
    endDateIso,
    trimmedLeadingWindow: true,
  };
}

export function buildFinanceOverviewEventTimelineModel(
  visual: FinanceForecastTimingVisualModel,
): FinanceOverviewEventTimelineModel {
  const { window } = visual;
  const presentationWindow = resolveFinanceOverviewEventTimelinePresentationWindow(visual);
  const windowStartDateIso = presentationWindow.startDateIso;
  const windowEndDateIso = presentationWindow.endDateIso;

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
      materialityFraction: marker.materialityFraction,
      xStartFraction: span.left,
      xEndFraction: Math.min(1, span.left + span.width),
      isAfterFinanceYearEnd: marker.isAfterFinanceYearEnd,
    };
  });

  const axis = buildFinanceOverviewEventTimelineAxis({
    windowStartDateIso,
    windowEndDateIso,
    financeYearStartDateIso: window.financeYearStartDateIso,
    financeYearEndDateIso: window.financeYearEndDateIso,
  });

  const materialityByEventId: Record<string, number> = {};
  for (const marker of visual.markers) {
    materialityByEventId[marker.eventId] = marker.materialityFraction;
  }

  const laneLayout = assignFinanceOverviewEventTimelineLanes({
    entries,
    materialityByEventId,
  });

  return {
    windowStartDateIso,
    windowEndDateIso,
    financeYearStartDateIso: window.financeYearStartDateIso,
    financeYearEndDateIso: window.financeYearEndDateIso,
    financeYearEndFraction: axis.financeYearEndFraction,
    entries,
    axisTicks: axis.ticks,
    yearBands: axis.yearBands,
    laneLayout,
  };
}
