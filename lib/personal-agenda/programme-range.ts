import { getDayWindow, formatIsoDay } from "@/lib/planner/date-utils";
import { startOfLocalDay } from "@/lib/tasks/management-deadline";

/** Default dashboard programme horizon (today inclusive through +N days). */
export const DEFAULT_PERSONAL_PROGRAMME_FORWARD_DAYS = 14;

/** Maximum explicit programme window length (guard against unbounded scans). */
export const MAX_PERSONAL_PROGRAMME_RANGE_DAYS = 366;

export type ResolvePersonalProgrammeRangeArgs = {
  timeZone: string;
  now?: Date;
  from?: Date;
  to?: Date;
};

export type PersonalProgrammeRange = {
  rangeStart: Date;
  rangeEnd: Date;
};

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Resolves an inclusive UTC window for programme queries.
 * Default: tenant-local start of today → end of day at today + DEFAULT_PERSONAL_PROGRAMME_FORWARD_DAYS.
 */
export function resolvePersonalProgrammeRange(
  args: ResolvePersonalProgrammeRangeArgs,
): PersonalProgrammeRange {
  const now = args.now ?? new Date();
  const todayLocalStart = startOfLocalDay(now, args.timeZone);

  if (args.from && args.to) {
    const spanMs = args.to.getTime() - args.from.getTime();
    const maxSpanMs = MAX_PERSONAL_PROGRAMME_RANGE_DAYS * 24 * 60 * 60 * 1000;
    if (spanMs < 0 || spanMs > maxSpanMs) {
      throw new RangeError("Personal programme range exceeds allowed bounds.");
    }
    return { rangeStart: args.from, rangeEnd: args.to };
  }

  const rangeStart = args.from ?? todayLocalStart;
  const defaultEndDay = addUtcDays(todayLocalStart, DEFAULT_PERSONAL_PROGRAMME_FORWARD_DAYS);
  const endDayWindow = getDayWindow(formatIsoDay(defaultEndDay));
  const rangeEnd = args.to ?? endDayWindow.end;

  return { rangeStart, rangeEnd };
}
