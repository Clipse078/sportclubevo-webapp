import { getDayWindow, formatIsoDay } from "@/lib/planner/date-utils";
import { startOfLocalDay } from "@/lib/tasks/management-deadline";
import type { ProgrammeTemporalMode } from "./types";

/** Default club/team programme horizon — upcoming window (tenant-local days). */
export const PROGRAMME_DEFAULT_FORWARD_DAYS = 90;

/** Default past window when temporal=past or combined list default. */
export const PROGRAMME_DEFAULT_PAST_DAYS = 30;

export const MAX_PROGRAMME_RANGE_DAYS = 366;

export type ResolveProgrammeRangeArgs = {
  timeZone: string;
  now?: Date;
  temporal?: ProgrammeTemporalMode;
  from?: Date;
  to?: Date;
};

export type ProgrammeRange = {
  rangeStart: Date;
  rangeEnd: Date;
};

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function endOfLocalDay(dayStart: Date): Date {
  const dayKey = formatIsoDay(dayStart);
  return getDayWindow(dayKey).end;
}

/**
 * Resolves an inclusive UTC query window for Programme Engine reads.
 * Default temporal=upcoming: tenant-local today → +PROGRAMME_DEFAULT_FORWARD_DAYS.
 * temporal=past: −PROGRAMME_DEFAULT_PAST_DAYS → end of yesterday (tenant-local).
 */
export function resolveProgrammeRange(args: ResolveProgrammeRangeArgs): ProgrammeRange {
  const now = args.now ?? new Date();
  const todayLocalStart = startOfLocalDay(now, args.timeZone);
  const temporal = args.temporal ?? "upcoming";

  if (args.from && args.to) {
    const spanMs = args.to.getTime() - args.from.getTime();
    const maxSpanMs = MAX_PROGRAMME_RANGE_DAYS * 24 * 60 * 60 * 1000;
    if (spanMs < 0 || spanMs > maxSpanMs) {
      throw new RangeError("Programme range exceeds allowed bounds.");
    }
    return { rangeStart: args.from, rangeEnd: args.to };
  }

  if (temporal === "past") {
    const pastStart = addUtcDays(todayLocalStart, -PROGRAMME_DEFAULT_PAST_DAYS);
    const yesterdayEnd = addUtcDays(todayLocalStart, -1);
    const rangeEnd = endOfLocalDay(yesterdayEnd);
    return { rangeStart: pastStart, rangeEnd: args.to ?? rangeEnd };
  }

  if (temporal === "range" && args.from) {
    const endDay = args.to ?? addUtcDays(args.from, PROGRAMME_DEFAULT_FORWARD_DAYS);
    return { rangeStart: args.from, rangeEnd: endOfLocalDay(endDay) };
  }

  const rangeStart = args.from ?? todayLocalStart;
  const defaultEndDay = addUtcDays(todayLocalStart, PROGRAMME_DEFAULT_FORWARD_DAYS);
  const rangeEnd = args.to ?? endOfLocalDay(defaultEndDay);
  return { rangeStart, rangeEnd };
}
