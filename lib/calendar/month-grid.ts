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

/** UTC-noon anchor so grid day keys do not depend on the host/browser local timezone. */
export function utcNoonFromCivilParts(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function tenantDayKeyFromCivilParts(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): string {
  return matchDayKeyInTimezone(utcNoonFromCivilParts(year, month, day), timeZone);
}

export type MonthGridCell = {
  dayKey: string;
  dayNumber: string;
  inMonth: boolean;
};

/**
 * Month grid cells with tenant-local day keys independent of server/browser TZ.
 * Civil Y-M-D comes from the Monday-first grid; keys are resolved in `timeZone`.
 */
export function buildMonthGridCells(monthParam: string, timeZone: string): MonthGridCell[] {
  const parsed = parseMonthParam(monthParam);
  const targetPrefix = parsed ? `${parsed.year}-${String(parsed.month).padStart(2, "0")}` : null;

  return buildMonthGridDates(monthParam).map((day) => {
    const year = day.getFullYear();
    const month = day.getMonth() + 1;
    const dayOfMonth = day.getDate();
    const dayKey = tenantDayKeyFromCivilParts(year, month, dayOfMonth, timeZone);
    const dayNumber = String(parseInt(dayKey.slice(8, 10), 10));
    const inMonth = targetPrefix ? dayKey.startsWith(`${targetPrefix}-`) : true;
    return { dayKey, dayNumber, inMonth };
  });
}

export function buildMonthGridDayKeys(monthParam: string, timeZone: string): string[] {
  return buildMonthGridCells(monthParam, timeZone).map((cell) => cell.dayKey);
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
