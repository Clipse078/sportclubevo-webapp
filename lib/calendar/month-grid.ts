import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfWeek,
} from "date-fns";
import { getDayWindow } from "@/lib/planner/date-utils";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import {
  formatMonthParam,
  parseMonthParam,
  resolveMatchcenterMonthWindow,
  type MatchcenterMonthWindow,
} from "@/lib/matchcenter/month-range";
import type { PersonalProgrammeRange } from "@/lib/personal-agenda/programme-range";

/** Parse YYYY-MM to a local Date at day 1 (same contract as Matchcenter month calendar). */
export function parseMonthParamToGridDate(monthParam: string): Date {
  const parsed = parseMonthParam(monthParam);
  if (!parsed) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(parsed.year, parsed.month - 1, 1);
}

/** Visible Mon–Sun grid dates for a calendar month param. */
export function buildMonthGridDates(monthParam: string): Date[] {
  const monthStart = parseMonthParamToGridDate(monthParam);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function buildMonthGridDayKeys(monthParam: string, timeZone: string): string[] {
  return buildMonthGridDates(monthParam).map((day) => matchDayKeyInTimezone(day, timeZone));
}

export type PersonalProgrammeMonthGridRange = PersonalProgrammeRange & {
  monthWindow: MatchcenterMonthWindow;
  gridDayKeys: string[];
};

/**
 * Bounded programme query window for a month calendar grid (leading/trailing weeks included).
 */
export function resolvePersonalProgrammeMonthGridRange(input: {
  monthParam: string;
  timeZone: string;
  now?: Date;
}): PersonalProgrammeMonthGridRange {
  const monthWindow = resolveMatchcenterMonthWindow({
    monthParam: input.monthParam,
    now: input.now,
    timeZone: input.timeZone,
  });

  const gridDates = buildMonthGridDates(monthWindow.param);
  const gridDayKeys = gridDates.map((day) => matchDayKeyInTimezone(day, input.timeZone));
  const firstKey = gridDayKeys[0]!;
  const lastKey = gridDayKeys[gridDayKeys.length - 1]!;

  const rangeStart = getDayWindow(firstKey).start;
  const rangeEnd = getDayWindow(lastKey).end;

  return {
    monthWindow,
    gridDayKeys,
    rangeStart,
    rangeEnd,
  };
}

export function shiftMonthParam(monthParam: string, deltaMonths: number): string {
  const parsed = parseMonthParam(monthParam);
  const base = parsed ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  const zeroBased = base.year * 12 + (base.month - 1) + deltaMonths;
  const year = Math.floor(zeroBased / 12);
  const month = (((zeroBased % 12) + 12) % 12) + 1;
  return formatMonthParam({ year, month });
}
