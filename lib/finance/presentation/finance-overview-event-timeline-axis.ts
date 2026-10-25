/**
 * FIN-05D-R2 — restrained month/year axis for overview event timeline.
 */

import { timelinePositionFraction } from "@/lib/finance/forecast/finance-forecast-timing-visual-layout";

export type FinanceOverviewEventTimelineAxisTickAlignment = "start" | "center" | "end";

export type FinanceOverviewEventTimelineAxisTick = {
  dateIso: string;
  xFraction: number;
  monthIndex: number;
  year: number;
  alignment: FinanceOverviewEventTimelineAxisTickAlignment;
};

export type FinanceOverviewEventTimelineYearBand = {
  label: string;
  startFraction: number;
  endFraction: number;
};

function utcDayMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00.000Z`);
}

function fiscalYearLabelFromEndIso(financeYearEndDateIso: string): string {
  const endYear = new Date(utcDayMs(financeYearEndDateIso)).getUTCFullYear();
  return String(endYear);
}

export function buildFinanceOverviewEventTimelineAxis(input: {
  windowStartDateIso: string;
  windowEndDateIso: string;
  financeYearStartDateIso: string | null;
  financeYearEndDateIso: string | null;
}): {
  ticks: FinanceOverviewEventTimelineAxisTick[];
  yearBands: FinanceOverviewEventTimelineYearBand[];
  financeYearEndFraction: number | null;
} {
  const startMs = utcDayMs(input.windowStartDateIso);
  const endMs = utcDayMs(input.windowEndDateIso);
  const start = new Date(startMs);

  const ticks: FinanceOverviewEventTimelineAxisTick[] = [];
  let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);

  while (cursor <= endMs) {
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

  if (ticks.length > 0) {
    ticks[0]!.alignment = "start";
    if (ticks.length > 1) {
      ticks[ticks.length - 1]!.alignment = "end";
      for (let i = 1; i < ticks.length - 1; i++) {
        ticks[i]!.alignment = "center";
      }
    } else {
      ticks[0]!.alignment = "center";
    }
  }

  const financeYearEndDateIso = input.financeYearEndDateIso;
  const financeYearEndFraction =
    financeYearEndDateIso &&
    financeYearEndDateIso >= input.windowStartDateIso &&
    financeYearEndDateIso <= input.windowEndDateIso
      ? timelinePositionFraction({
          dateIso: financeYearEndDateIso,
          windowStartDateIso: input.windowStartDateIso,
          windowEndDateIso: input.windowEndDateIso,
        })
      : null;

  const yearBands: FinanceOverviewEventTimelineYearBand[] = [];

  if (
    financeYearEndFraction !== null &&
    financeYearEndDateIso &&
    input.financeYearStartDateIso
  ) {
    const beforeLabel = fiscalYearLabelFromEndIso(financeYearEndDateIso);
    const nextStartMs = utcDayMs(financeYearEndDateIso) + 86_400_000;
    const afterEndYear = new Date(nextStartMs).getUTCFullYear();
    yearBands.push({
      label: beforeLabel,
      startFraction: 0,
      endFraction: financeYearEndFraction,
    });
    yearBands.push({
      label: String(afterEndYear),
      startFraction: financeYearEndFraction,
      endFraction: 1,
    });
  } else if (ticks.length > 0) {
    let bandStart = 0;
    let bandYear = ticks[0]!.year;
    for (let i = 1; i <= ticks.length; i++) {
      const tick = ticks[i];
      if (!tick || tick.year !== bandYear) {
        const startTick = ticks[bandStart]!;
        const endTick = ticks[i - 1]!;
        yearBands.push({
          label: String(bandYear),
          startFraction: startTick.xFraction,
          endFraction: endTick.xFraction,
        });
        if (tick) {
          bandStart = i;
          bandYear = tick.year;
        }
      }
    }
  }

  return { ticks, yearBands, financeYearEndFraction };
}
