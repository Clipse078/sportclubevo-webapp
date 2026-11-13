/**
 * SCE-MATCHCENTER-UX — Spielplanung list scope, month chips, and calendar split.
 *
 * Spielplanung loads all upcoming fixtures in a bounded forward window (server query).
 * The `month` URL param is an explicit list filter only — not the query range.
 * Mini-calendar navigation uses `cal` (calendar month) independently.
 */

import {
  MATCHCENTER_DEFAULT_FUTURE_DAYS,
  MATCHCENTER_MAX_LIMIT,
} from "./query-limits";
import type { MatchcenterRowViewModel } from "./view-model";
import type { MatchcenterMatchSummary } from "./types";
import {
  formatMonthLabel,
  formatMonthParam,
  getZonedYearMonth,
  parseMonthParam,
  resolveMatchcenterMonthWindow,
  type MatchcenterYearMonth,
} from "./month-range";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type MatchcenterSpielplanungQueryWindow = {
  from: Date;
  to: Date;
  limit: number;
};

export type SpielplanMonthChip = {
  param: string;
  label: string;
};

export function normalizeSpielplanungListMonthFilter(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.toLowerCase() === "alle") {
    return null;
  }
  return parseMonthParam(trimmed) ? trimmed : null;
}

/**
 * Forward-looking query window for Spielplanung — not derived from the list month filter.
 */
export function resolveMatchcenterSpielplanungQueryWindow(input: {
  now?: Date;
  timeZone?: string;
  futureDays?: number;
  limit?: number;
}): MatchcenterSpielplanungQueryWindow {
  const timeZone = input.timeZone ?? "Europe/Zurich";
  const now = input.now ?? new Date();
  const futureDays = input.futureDays ?? MATCHCENTER_DEFAULT_FUTURE_DAYS;

  const todayYearMonth = getZonedYearMonth(now, timeZone);
  const from = resolveMatchcenterMonthWindow({
    monthParam: formatMonthParam(todayYearMonth),
    now,
    timeZone,
  }).from;

  const to = new Date(now.getTime() + futureDays * DAY_IN_MILLISECONDS);

  return {
    from,
    to,
    limit: input.limit ?? MATCHCENTER_MAX_LIMIT,
  };
}

export function resolveMatchcenterCalendarMonthParam(input: {
  calendarMonthParam?: string | null;
  now?: Date;
  timeZone?: string;
}): string {
  const timeZone = input.timeZone ?? "Europe/Zurich";
  const parsed = parseMonthParam(input.calendarMonthParam);
  if (parsed) {
    return formatMonthParam(parsed);
  }
  return resolveMatchcenterMonthWindow({ timeZone, now: input.now }).param;
}

export function monthParamFromDate(date: Date, timeZone: string): string {
  const { year, month } = getZonedYearMonth(date, timeZone);
  return formatMonthParam({ year, month });
}

export function filterSpielplanungRowsByListMonth(
  rows: readonly MatchcenterRowViewModel[],
  listMonthFilter: string | null,
  timeZone: string,
): MatchcenterRowViewModel[] {
  if (!listMonthFilter) {
    return [...rows];
  }
  const target = parseMonthParam(listMonthFilter);
  if (!target) {
    return [...rows];
  }
  return rows.filter((row) => {
    const ym = getZonedYearMonth(row.match.startAt, timeZone);
    return ym.year === target.year && ym.month === target.month;
  });
}

function distinctYearsFromMonthParams(monthParams: readonly string[]): Set<number> {
  const years = new Set<number>();
  for (const param of monthParams) {
    const parsed = parseMonthParam(param);
    if (parsed) years.add(parsed.year);
  }
  return years;
}

export function formatSpielplanMonthChipLabel(
  yearMonth: MatchcenterYearMonth,
  locale: string,
  timeZone: string,
  options: { showYear: boolean },
): string {
  const monthOnly = new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone,
  })
    .format(new Date(Date.UTC(yearMonth.year, yearMonth.month - 1, 15, 12)))
    .toUpperCase();

  if (!options.showYear) {
    return monthOnly;
  }

  return `${monthOnly} ${yearMonth.year}`;
}

/**
 * Month chips for months that contain at least one row in the unfiltered upcoming set.
 */
export function deriveSpielplanMonthChips(
  rows: readonly MatchcenterRowViewModel[],
  locale: string,
  timeZone: string,
): SpielplanMonthChip[] {
  const monthSet = new Map<string, MatchcenterYearMonth>();

  for (const row of rows) {
    const ym = getZonedYearMonth(row.match.startAt, timeZone);
    const param = formatMonthParam(ym);
    if (!monthSet.has(param)) {
      monthSet.set(param, ym);
    }
  }

  const params = [...monthSet.keys()].sort();
  const showYear = distinctYearsFromMonthParams(params).size > 1;

  return params.map((param) => ({
    param,
    label: formatSpielplanMonthChipLabel(monthSet.get(param)!, locale, timeZone, {
      showYear,
    }),
  }));
}

export function formatSpielplanMonthSectionHeading(
  monthParam: string,
  locale: string,
  timeZone: string,
): string {
  const parsed = parseMonthParam(monthParam);
  if (!parsed) {
    return monthParam;
  }
  return formatMonthLabel(parsed, locale, timeZone).toUpperCase();
}

export function collectSpielplanungMonthParamsFromRows(
  rows: readonly MatchcenterRowViewModel[],
  timeZone: string,
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    set.add(monthParamFromDate(row.match.startAt, timeZone));
  }
  return [...set].sort();
}

export function filterMatchSummariesToCalendarMonth(
  matches: readonly MatchcenterMatchSummary[],
  calendarMonthParam: string | null | undefined,
  timeZone: string,
): MatchcenterMatchSummary[] {
  const target = parseMonthParam(calendarMonthParam);
  if (!target) {
    return [...matches];
  }
  return matches.filter((match) => {
    const ym = getZonedYearMonth(match.startAt, timeZone);
    return ym.year === target.year && ym.month === target.month;
  });
}

export function mergeMatchcenterMatchesById(
  primary: readonly MatchcenterMatchSummary[],
  secondary: readonly MatchcenterMatchSummary[],
): MatchcenterMatchSummary[] {
  const byId = new Map<string, MatchcenterMatchSummary>();
  for (const match of primary) {
    byId.set(match.id, match);
  }
  for (const match of secondary) {
    if (!byId.has(match.id)) {
      byId.set(match.id, match);
    }
  }
  return [...byId.values()].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id),
  );
}

export function isSpielplanungQueryLikelyTruncated(
  loadedCount: number,
  limit: number,
): boolean {
  return loadedCount >= limit;
}
