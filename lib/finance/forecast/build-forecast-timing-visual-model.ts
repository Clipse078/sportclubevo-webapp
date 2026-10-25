/**
 * FIN-04E-07 — pure visual timing model from 04E-04 overview + persisted events.
 */

import { parseFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import { classifyExpectedEventTemporalPosition } from "@/lib/finance/forecast/classify-expected-event-temporal-position";
import type { ExpectedFinancialEventRecord } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import type { FinanceForecastTimingOverviewReadModel } from "@/lib/finance/forecast/finance-forecast-timing-read-model";
import { deriveFinanceForecastTimingWorkspacePresentationState } from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";
import type {
  FinanceForecastTimingVisualModel,
  FinanceTimingVisualEventMarker,
  FinanceTimingVisualTimelineInterval,
} from "@/lib/finance/forecast/finance-forecast-timing-visual-types";

function utcDayMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00.000Z`);
}

function addUtcDays(iso: string, days: number): string {
  const d = parseFinanceCalendarDateIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonthFromStartIso(monthStartIso: string): string {
  const start = parseFinanceCalendarDateIso(monthStartIso);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return end.toISOString().slice(0, 10);
}

function midpointIso(startIso: string, endIso: string): string {
  const mid = Math.floor((utcDayMs(startIso) + utcDayMs(endIso)) / 2);
  return new Date(mid).toISOString().slice(0, 10);
}

function resolveTimelineInterval(event: ExpectedFinancialEventRecord): FinanceTimingVisualTimelineInterval | null {
  if (event.timingPrecision === "EXACT_DATE" && event.expectedDateIso) {
    return {
      kind: "EXACT_DATE",
      startDateIso: event.expectedDateIso,
      endDateIso: event.expectedDateIso,
      plotAnchorDateIso: event.expectedDateIso,
    };
  }
  if (event.timingPrecision === "MONTH" && event.expectedMonthStartIso) {
    const endIso = lastDayOfMonthFromStartIso(event.expectedMonthStartIso);
    return {
      kind: "MONTH",
      startDateIso: event.expectedMonthStartIso,
      endDateIso: endIso,
      plotAnchorDateIso: midpointIso(event.expectedMonthStartIso, endIso),
    };
  }
  if (
    event.timingPrecision === "DATE_RANGE" &&
    event.rangeStartDateIso &&
    event.rangeEndDateIso
  ) {
    return {
      kind: "DATE_RANGE",
      startDateIso: event.rangeStartDateIso,
      endDateIso: event.rangeEndDateIso,
      plotAnchorDateIso: midpointIso(event.rangeStartDateIso, event.rangeEndDateIso),
    };
  }
  return null;
}

function isAfterFinanceYearEnd(financeYearEndDateIso: string | null, interval: FinanceTimingVisualTimelineInterval): boolean {
  if (!financeYearEndDateIso) return false;
  return utcDayMs(interval.startDateIso) > utcDayMs(financeYearEndDateIso);
}

function computeMaterialityFractions(markers: FinanceTimingVisualEventMarker[]): void {
  if (markers.length === 0) return;
  const max = Math.max(...markers.map((m) => m.expectedAmountMinor));
  if (max <= 0) {
    for (const marker of markers) marker.materialityFraction = 0;
    return;
  }
  for (const marker of markers) {
    marker.materialityFraction = marker.expectedAmountMinor / max;
  }
}

function computeVisualWindow(input: {
  actualsThroughDateIso: string;
  financeYearStartDateIso: string | null;
  financeYearEndDateIso: string | null;
  markerIntervals: ReadonlyArray<FinanceTimingVisualTimelineInterval>;
}): { startDateIso: string; endDateIso: string } {
  const cutoffMs = utcDayMs(input.actualsThroughDateIso);
  const defaultStart = input.financeYearStartDateIso ?? input.actualsThroughDateIso;
  let startMs = Math.max(utcDayMs(defaultStart), cutoffMs);
  let endMs = startMs;

  const endPoints = input.markerIntervals.map((i) => utcDayMs(i.endDateIso));
  if (endPoints.length > 0) {
    startMs = Math.min(startMs, ...input.markerIntervals.map((i) => utcDayMs(i.startDateIso)));
    endMs = Math.max(...endPoints);
  } else if (input.financeYearEndDateIso) {
    endMs = utcDayMs(input.financeYearEndDateIso);
  } else {
    endMs = utcDayMs(addUtcDays(input.actualsThroughDateIso, 180));
  }

  if (endPoints.length >= 3) {
    const sorted = [...endPoints].sort((a, b) => a - b);
    const p90Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9));
    const p90 = sorted[p90Index]!;
    const max = sorted[sorted.length - 1]!;
    if (max - p90 > 1000 * 60 * 60 * 24 * 60) {
      endMs = Math.max(endMs, p90);
      endMs = Math.min(endMs, max);
      endMs = utcDayMs(addUtcDays(new Date(endMs).toISOString().slice(0, 10), 14));
    }
  }

  if (input.financeYearEndDateIso) {
    endMs = Math.max(endMs, utcDayMs(input.financeYearEndDateIso));
  }

  const minSpanMs = 1000 * 60 * 60 * 24 * 30;
  if (endMs - startMs < minSpanMs) {
    endMs = startMs + minSpanMs;
  }

  return {
    startDateIso: new Date(startMs).toISOString().slice(0, 10),
    endDateIso: new Date(endMs).toISOString().slice(0, 10),
  };
}

export type BuildFinanceForecastTimingVisualModelInput = {
  overview: FinanceForecastTimingOverviewReadModel;
  events: ReadonlyArray<ExpectedFinancialEventRecord>;
  accountNameById: ReadonlyMap<string, string>;
  financeYearStartDateIso: string | null;
  financeYearEndDateIso: string | null;
};

export function buildFinanceForecastTimingVisualModel(
  input: BuildFinanceForecastTimingVisualModelInput,
): FinanceForecastTimingVisualModel {
  const { overview } = input;
  const actualsThroughDateIso = overview.actualsThroughDateIso;

  const markers: FinanceTimingVisualEventMarker[] = [];

  for (const event of input.events) {
    const interval = resolveTimelineInterval(event);
    if (!interval) continue;

    const temporalPositionAtCutoff = classifyExpectedEventTemporalPosition(actualsThroughDateIso, {
      expectedAmountMinor: event.expectedAmountMinor,
      timingPrecision: event.timingPrecision,
      expectedDateIso: event.expectedDateIso,
      expectedMonthStartIso: event.expectedMonthStartIso,
      rangeStartDateIso: event.rangeStartDateIso,
      rangeEndDateIso: event.rangeEndDateIso,
    });

    if (temporalPositionAtCutoff === "NOT_FUTURE") continue;

    const account =
      overview.accounts.find((a) => a.financialAccountId === event.financialAccountId) ?? null;

    markers.push({
      eventId: event.id,
      financialAccountId: event.financialAccountId,
      accountName: account?.name ?? input.accountNameById.get(event.financialAccountId) ?? event.financialAccountId,
      accountType: account?.accountType ?? "EXPENSE",
      expectedAmountMinor: event.expectedAmountMinor,
      timingPrecision: event.timingPrecision,
      interval,
      temporalPositionAtCutoff,
      isAfterFinanceYearEnd: isAfterFinanceYearEnd(input.financeYearEndDateIso, interval),
      materialityFraction: 0,
      description: event.description,
      isManual: event.sourceKind === "MANUAL",
    });
  }

  markers.sort((a, b) => {
    const pos = utcDayMs(a.interval.plotAnchorDateIso) - utcDayMs(b.interval.plotAnchorDateIso);
    if (pos !== 0) return pos;
    return a.eventId.localeCompare(b.eventId);
  });

  computeMaterialityFractions(markers);

  const windowRange = computeVisualWindow({
    actualsThroughDateIso,
    financeYearStartDateIso: input.financeYearStartDateIso,
    financeYearEndDateIso: input.financeYearEndDateIso,
    markerIntervals: markers.map((m) => m.interval),
  });

  const income = overview.annual.income;
  const expense = overview.annual.expense;
  const remainingFutureExpectationMinor =
    income.remainingFutureExpectationMinor + expense.remainingFutureExpectationMinor;
  const timedFutureExpectationMinor =
    income.timedFutureExpectationMinor + expense.timedFutureExpectationMinor;
  const untimed = {
    incomeMinor: income.unscheduledRemainderMinor,
    expenseMinor: expense.unscheduledRemainderMinor,
    totalMinor: income.unscheduledRemainderMinor + expense.unscheduledRemainderMinor,
  };

  const isOverallocated =
    overview.timingCoverage.kind === "RATIO" && overview.timingCoverage.isOverallocated;

  const workspacePresentationState = deriveFinanceForecastTimingWorkspacePresentationState({
    hasRemainingExpectation: remainingFutureExpectationMinor > 0,
    timedFutureExpectationMinor,
    untimedTotalMinor: untimed.totalMinor,
    plottableMarkerCount: markers.length,
  });

  return {
    window: {
      ...windowRange,
      financeYearStartDateIso: input.financeYearStartDateIso,
      financeYearEndDateIso: input.financeYearEndDateIso,
      actualsThroughDateIso,
    },
    markers,
    untimed,
    timingCoverage: overview.timingCoverage,
    interpretationState: overview.interpretationState,
    remainingFutureExpectationMinor,
    timedFutureExpectationMinor,
    isOverallocated,
    hasRemainingExpectation: remainingFutureExpectationMinor > 0,
    workspacePresentationState,
    structuredSummary: {
      futureTimedEventCount: overview.counts.futureTimedEventCount,
      ambiguousEventCount: overview.counts.ambiguousEventCount,
      incomeTimedMinor: income.timedFutureExpectationMinor,
      expenseTimedMinor: expense.timedFutureExpectationMinor,
      untimedTotalMinor: untimed.totalMinor,
      isOverallocated: Boolean(isOverallocated),
    },
    overviewAnnual: overview.annual,
  };
}
