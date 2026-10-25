/**
 * FIN-04E-07R4 — zero-baseline movement chart presentation model (pure).
 */

import { parseFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import type { FinanceTimingVisualEventMarker } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import {
  timelinePositionFraction,
  timelineSpanFractions,
} from "@/lib/finance/forecast/finance-forecast-timing-visual-layout";

export type FinanceForecastMovementChartVisualKind = "EXACT_DATE" | "MONTH" | "DATE_RANGE";

export type FinanceForecastMovementChartPlottedMovement = {
  eventId: string;
  direction: "INCOME" | "EXPENSE";
  signedAmountMinor: number;
  precision: FinanceForecastMovementChartVisualKind;
  startDateIso: string;
  endDateIso: string;
  /** Normalized 0–1 within the visual window (after overlap resolution). */
  xStartFraction: number;
  xEndFraction: number;
  /** SVG plot coordinates — y grows downward; zeroY is the baseline. */
  xStart: number;
  xEnd: number;
  yZero: number;
  yValue: number;
  visualKind: FinanceForecastMovementChartVisualKind;
  isAmbiguous: boolean;
  isAfterFinanceYearEnd: boolean;
  overlapLaneIndex: number;
  overlapLaneCount: number;
  marker: FinanceTimingVisualEventMarker;
};

export type FinanceForecastMovementChartTick = {
  signedAmountMinor: number;
  y: number;
};

export type FinanceForecastMovementChartDateTick = {
  dateIso: string;
  xFraction: number;
  x: number;
};

export type FinanceForecastMovementChartModel = {
  plotWidth: number;
  plotHeight: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  svgWidth: number;
  svgHeight: number;
  domain: {
    windowStartDateIso: string;
    windowEndDateIso: string;
    minSignedAmountMinor: number;
    maxSignedAmountMinor: number;
    zeroY: number;
    plotTop: number;
    plotBottom: number;
    plotLeft: number;
    plotRight: number;
  };
  yTicks: FinanceForecastMovementChartTick[];
  xTicks: FinanceForecastMovementChartDateTick[];
  financeYearBoundary: { xFraction: number; x: number } | null;
  actualsCutoff: { xFraction: number; x: number } | null;
  movements: FinanceForecastMovementChartPlottedMovement[];
};

const DEFAULT_SVG_WIDTH = 720;
const DEFAULT_SVG_HEIGHT = 320;
const MARGIN_LEFT = 52;
const MARGIN_RIGHT = 12;
const MARGIN_TOP = 16;
const MARGIN_BOTTOM = 36;
const EXACT_DATE_MIN_WIDTH_FRACTION = 0.012;
const MIN_BAR_HEIGHT_PX = 4;

function signedAmountForMarker(marker: FinanceTimingVisualEventMarker): number {
  return marker.accountType === "INCOME"
    ? marker.expectedAmountMinor
    : -marker.expectedAmountMinor;
}

function utcDayMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00.000Z`);
}

function expandSignedDomain(minSigned: number, maxSigned: number): {
  minSignedAmountMinor: number;
  maxSignedAmountMinor: number;
} {
  if (minSigned === 0 && maxSigned === 0) {
    return { minSignedAmountMinor: -1, maxSignedAmountMinor: 1 };
  }
  const span = maxSigned - minSigned;
  const pad = Math.max(span * 0.12, Math.max(Math.abs(minSigned), Math.abs(maxSigned)) * 0.08, 1);
  return {
    minSignedAmountMinor: minSigned - pad,
    maxSignedAmountMinor: maxSigned + pad,
  };
}

function niceStepForMagnitude(maxAbs: number): number {
  if (maxAbs <= 0) return 1;
  const rough = maxAbs / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  let nice = 1;
  if (normalized > 5) nice = 10;
  else if (normalized > 2) nice = 5;
  else if (normalized > 1) nice = 2;
  return nice * magnitude;
}

export function computeFinanceForecastMovementChartYTicks(input: {
  minSignedAmountMinor: number;
  maxSignedAmountMinor: number;
}): number[] {
  const maxAbs = Math.max(
    Math.abs(input.minSignedAmountMinor),
    Math.abs(input.maxSignedAmountMinor),
  );
  const step = niceStepForMagnitude(maxAbs);
  const ticks: number[] = [0];
  for (let v = step; v <= input.maxSignedAmountMinor + step * 0.01; v += step) {
    ticks.push(v);
  }
  for (let v = -step; v >= input.minSignedAmountMinor - step * 0.01; v -= step) {
    ticks.push(v);
  }
  ticks.sort((a, b) => a - b);
  const unique: number[] = [];
  for (const t of ticks) {
    if (unique.length === 0 || unique[unique.length - 1] !== t) unique.push(t);
  }
  return unique;
}

function yFromSigned(input: {
  signedAmountMinor: number;
  minSigned: number;
  maxSigned: number;
  plotTop: number;
  plotBottom: number;
}): number {
  const { minSigned, maxSigned, plotTop, plotBottom } = input;
  const span = maxSigned - minSigned;
  if (span <= 0) return (plotTop + plotBottom) / 2;
  const frac = (input.signedAmountMinor - minSigned) / span;
  return plotBottom - frac * (plotBottom - plotTop);
}

function monthStartIsoFromDateIso(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function addMonthsUtc(monthStartIso: string, months: number): string {
  const d = parseFinanceCalendarDateIso(monthStartIso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function computeFinanceForecastMovementChartXTicks(input: {
  windowStartDateIso: string;
  windowEndDateIso: string;
  maxTicks?: number;
}): string[] {
  const maxTicks = input.maxTicks ?? 5;
  const startMs = utcDayMs(input.windowStartDateIso);
  const endMs = utcDayMs(input.windowEndDateIso);
  if (endMs <= startMs) return [input.windowStartDateIso];

  const ticks: string[] = [];
  let cursor = monthStartIsoFromDateIso(input.windowStartDateIso);
  if (utcDayMs(cursor) < startMs) {
    cursor = addMonthsUtc(cursor, 1);
  }
  while (utcDayMs(cursor) <= endMs && ticks.length < maxTicks - 1) {
    if (utcDayMs(cursor) >= startMs) ticks.push(cursor);
    cursor = addMonthsUtc(cursor, 1);
  }
  if (!ticks.includes(input.windowStartDateIso) && ticks.length < maxTicks) {
    ticks.unshift(input.windowStartDateIso);
  }
  if (!ticks.some((t) => t === input.windowEndDateIso) && ticks.length < maxTicks) {
    ticks.push(input.windowEndDateIso);
  }
  ticks.sort((a, b) => utcDayMs(a) - utcDayMs(b));
  const deduped: string[] = [];
  for (const t of ticks) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== t) deduped.push(t);
  }
  return deduped.slice(0, maxTicks);
}

type RawSpan = {
  eventId: string;
  xStartFraction: number;
  xEndFraction: number;
  marker: FinanceTimingVisualEventMarker;
  signedAmountMinor: number;
  visualKind: FinanceForecastMovementChartVisualKind;
};

function initialSpanForMarker(
  marker: FinanceTimingVisualEventMarker,
  window: FinanceForecastTimingVisualModel["window"],
): RawSpan {
  const signedAmountMinor = signedAmountForMarker(marker);
  const visualKind = marker.interval.kind;
  let xStartFraction: number;
  let xEndFraction: number;

  if (visualKind === "EXACT_DATE") {
    const center = timelinePositionFraction({
      dateIso: marker.interval.startDateIso,
      windowStartDateIso: window.startDateIso,
      windowEndDateIso: window.endDateIso,
    });
    const half = EXACT_DATE_MIN_WIDTH_FRACTION / 2;
    xStartFraction = Math.max(0, center - half);
    xEndFraction = Math.min(1, center + half);
  } else {
    const span = timelineSpanFractions({
      startDateIso: marker.interval.startDateIso,
      endDateIso: marker.interval.endDateIso,
      windowStartDateIso: window.startDateIso,
      windowEndDateIso: window.endDateIso,
    });
    xStartFraction = span.left;
    xEndFraction = Math.min(1, span.left + span.width);
  }

  return {
    eventId: marker.eventId,
    xStartFraction,
    xEndFraction,
    marker,
    signedAmountMinor,
    visualKind,
  };
}

function resolveOverlapLanes(spans: RawSpan[]): Map<string, { lane: number; laneCount: number }> {
  const sorted = [...spans].sort((a, b) => {
    const d = a.xStartFraction - b.xStartFraction;
    if (d !== 0) return d;
    return a.eventId.localeCompare(b.eventId);
  });

  const lanes: RawSpan[][] = [];

  for (const span of sorted) {
    let placed = false;
    for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
      const lane = lanes[laneIndex]!;
      const last = lane[lane.length - 1]!;
      if (span.xStartFraction >= last.xEndFraction - 0.0001) {
        lane.push(span);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([span]);
  }

  const laneCount = Math.max(1, lanes.length);
  const result = new Map<string, { lane: number; laneCount: number }>();
  for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
    for (const span of lanes[laneIndex]!) {
      result.set(span.eventId, { lane: laneIndex, laneCount });
    }
  }
  return result;
}

function applyLaneOffsets(
  span: RawSpan,
  laneInfo: { lane: number; laneCount: number },
): { xStartFraction: number; xEndFraction: number } {
  if (laneInfo.laneCount <= 1) {
    return { xStartFraction: span.xStartFraction, xEndFraction: span.xEndFraction };
  }
  const width = span.xEndFraction - span.xStartFraction;
  const subWidth = width / laneInfo.laneCount;
  const xStartFraction = span.xStartFraction + subWidth * laneInfo.lane;
  return { xStartFraction, xEndFraction: xStartFraction + subWidth };
}

export function buildFinanceForecastTimingMovementChartModel(
  visual: FinanceForecastTimingVisualModel,
  options?: { svgWidth?: number; svgHeight?: number },
): FinanceForecastMovementChartModel {
  const svgWidth = options?.svgWidth ?? DEFAULT_SVG_WIDTH;
  const svgHeight = options?.svgHeight ?? DEFAULT_SVG_HEIGHT;
  const plotLeft = MARGIN_LEFT;
  const plotRight = svgWidth - MARGIN_RIGHT;
  const plotTop = MARGIN_TOP;
  const plotBottom = svgHeight - MARGIN_BOTTOM;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const rawSpans = visual.markers.map((m) => initialSpanForMarker(m, visual.window));
  const laneMap = resolveOverlapLanes(rawSpans);

  const signedValues = rawSpans.map((s) => s.signedAmountMinor);
  const minSignedRaw = signedValues.length ? Math.min(...signedValues, 0) : 0;
  const maxSignedRaw = signedValues.length ? Math.max(...signedValues, 0) : 0;
  const expanded = expandSignedDomain(minSignedRaw, maxSignedRaw);

  const zeroY = yFromSigned({
    signedAmountMinor: 0,
    minSigned: expanded.minSignedAmountMinor,
    maxSigned: expanded.maxSignedAmountMinor,
    plotTop,
    plotBottom,
  });

  const yTickValues = computeFinanceForecastMovementChartYTicks(expanded);
  const yTicks: FinanceForecastMovementChartTick[] = yTickValues.map((signedAmountMinor) => ({
    signedAmountMinor,
    y: yFromSigned({
      signedAmountMinor,
      minSigned: expanded.minSignedAmountMinor,
      maxSigned: expanded.maxSignedAmountMinor,
      plotTop,
      plotBottom,
    }),
  }));

  const xTickDates = computeFinanceForecastMovementChartXTicks({
    windowStartDateIso: visual.window.startDateIso,
    windowEndDateIso: visual.window.endDateIso,
  });
  const xTicks: FinanceForecastMovementChartDateTick[] = xTickDates.map((dateIso) => {
    const xFraction = timelinePositionFraction({
      dateIso,
      windowStartDateIso: visual.window.startDateIso,
      windowEndDateIso: visual.window.endDateIso,
    });
    return { dateIso, xFraction, x: plotLeft + xFraction * plotWidth };
  });

  const movements: FinanceForecastMovementChartPlottedMovement[] = rawSpans.map((span) => {
    const laneInfo = laneMap.get(span.eventId) ?? { lane: 0, laneCount: 1 };
    const adjusted = applyLaneOffsets(span, laneInfo);
    const xStart = plotLeft + adjusted.xStartFraction * plotWidth;
    const xEnd = plotLeft + adjusted.xEndFraction * plotWidth;
    let yValue = yFromSigned({
      signedAmountMinor: span.signedAmountMinor,
      minSigned: expanded.minSignedAmountMinor,
      maxSigned: expanded.maxSignedAmountMinor,
      plotTop,
      plotBottom,
    });
    if (Math.abs(yValue - zeroY) < MIN_BAR_HEIGHT_PX && span.signedAmountMinor !== 0) {
      yValue =
        span.signedAmountMinor > 0 ? zeroY - MIN_BAR_HEIGHT_PX : zeroY + MIN_BAR_HEIGHT_PX;
    }

    return {
      eventId: span.eventId,
      direction: span.marker.accountType,
      signedAmountMinor: span.signedAmountMinor,
      precision: span.visualKind,
      startDateIso: span.marker.interval.startDateIso,
      endDateIso: span.marker.interval.endDateIso,
      xStartFraction: adjusted.xStartFraction,
      xEndFraction: adjusted.xEndFraction,
      xStart,
      xEnd,
      yZero: zeroY,
      yValue,
      visualKind: span.visualKind,
      isAmbiguous: span.marker.temporalPositionAtCutoff === "AMBIGUOUS_AT_CUTOFF",
      isAfterFinanceYearEnd: span.marker.isAfterFinanceYearEnd,
      overlapLaneIndex: laneInfo.lane,
      overlapLaneCount: laneInfo.laneCount,
      marker: span.marker,
    };
  });

  movements.sort((a, b) => {
    const x = a.xStart - b.xStart;
    if (x !== 0) return x;
    return a.eventId.localeCompare(b.eventId);
  });

  let financeYearBoundary: { xFraction: number; x: number } | null = null;
  if (visual.window.financeYearEndDateIso) {
    const xFraction = timelinePositionFraction({
      dateIso: visual.window.financeYearEndDateIso,
      windowStartDateIso: visual.window.startDateIso,
      windowEndDateIso: visual.window.endDateIso,
    });
    if (xFraction > 0 && xFraction < 1) {
      financeYearBoundary = { xFraction, x: plotLeft + xFraction * plotWidth };
    }
  }

  const cutoffFraction = timelinePositionFraction({
    dateIso: visual.window.actualsThroughDateIso,
    windowStartDateIso: visual.window.startDateIso,
    windowEndDateIso: visual.window.endDateIso,
  });

  return {
    plotWidth,
    plotHeight,
    marginLeft: MARGIN_LEFT,
    marginRight: MARGIN_RIGHT,
    marginTop: MARGIN_TOP,
    marginBottom: MARGIN_BOTTOM,
    svgWidth,
    svgHeight,
    domain: {
      windowStartDateIso: visual.window.startDateIso,
      windowEndDateIso: visual.window.endDateIso,
      minSignedAmountMinor: expanded.minSignedAmountMinor,
      maxSignedAmountMinor: expanded.maxSignedAmountMinor,
      zeroY,
      plotTop,
      plotBottom,
      plotLeft,
      plotRight,
    },
    yTicks,
    xTicks,
    financeYearBoundary,
    actualsCutoff: { xFraction: cutoffFraction, x: plotLeft + cutoffFraction * plotWidth },
    movements,
  };
}
