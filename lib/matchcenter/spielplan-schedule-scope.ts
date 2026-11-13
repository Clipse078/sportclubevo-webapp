/**
 * SCE-MATCHCENTER-UX — Spielplanung list scope, month chips, and calendar split.
 *
 * Spielplanung loads upcoming fixtures within the active season schedule scope
 * (or an explicit date range when no canonical season exists).
 * The `month` URL param is an explicit list filter only — not the query range.
 * Mini-calendar navigation uses `cal` (calendar month) independently.
 */

import {
  MATCHCENTER_DEFAULT_FUTURE_DAYS,
  MATCHCENTER_SPIELPLAN_PAGE_SIZE,
} from "./query-limits";
import type { MatchcenterScheduleAnchor } from "./query-service";
import type { MatchcenterRowViewModel } from "./view-model";
import type { MatchcenterMatchSummary } from "./types";
import {
  formatMonthLabel,
  formatMonthParam,
  getZonedYearMonth,
  parseMonthParam,
  resolveMatchcenterMonthWindow,
  startOfZonedIsoDate,
  type MatchcenterYearMonth,
} from "./month-range";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type MatchcenterSeasonScope = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
};

export type SpielplanScheduleScopeSource =
  | "season"
  | "explicit-range"
  | "default-range";

export type MatchcenterSpielplanScheduleScope = {
  from: Date;
  to: Date;
  seasonId: string | null;
  seasonName: string | null;
  source: SpielplanScheduleScopeSource;
  label: string;
  pageSize: number;
};

export type MatchcenterSpielplanungQueryWindow = {
  from: Date;
  to: Date;
  limit: number;
  skip: number;
  enforceMaxWindow: boolean;
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

function parseScopeDateParam(
  value: string | null | undefined,
  timeZone: string,
): Date | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  return startOfZonedIsoDate(trimmed, timeZone);
}

/**
 * Resolves the Spielplanung schedule scope from the active season or explicit URL range.
 */
export function resolveMatchcenterSpielplanScheduleScope(input: {
  now?: Date;
  timeZone?: string;
  season?: MatchcenterSeasonScope | null;
  scopeFromParam?: string | null;
  scopeToParam?: string | null;
  pageSize?: number;
}): MatchcenterSpielplanScheduleScope {
  const timeZone = input.timeZone ?? "Europe/Zurich";
  const now = input.now ?? new Date();
  const pageSize = input.pageSize ?? MATCHCENTER_SPIELPLAN_PAGE_SIZE;

  const explicitFrom = parseScopeDateParam(input.scopeFromParam, timeZone);
  const explicitTo = parseScopeDateParam(input.scopeToParam, timeZone);

  if (input.season) {
    const todayStart = resolveMatchcenterMonthWindow({
      timeZone,
      now,
    }).from;

    return {
      from: new Date(
        Math.max(todayStart.getTime(), input.season.startDate.getTime()),
      ),
      to: input.season.endDate,
      seasonId: input.season.id,
      seasonName: input.season.name,
      source: explicitFrom || explicitTo ? "explicit-range" : "season",
      label: `Saison ${input.season.name}`,
      pageSize,
    };
  }

  const defaultFrom = resolveMatchcenterMonthWindow({ timeZone, now }).from;
  const defaultTo = new Date(now.getTime() + MATCHCENTER_DEFAULT_FUTURE_DAYS * DAY_IN_MILLISECONDS);

  const from = explicitFrom ?? defaultFrom;
  const to =
    explicitTo && explicitTo > from
      ? explicitTo
      : defaultTo;

  const source: SpielplanScheduleScopeSource = explicitFrom || explicitTo
    ? "explicit-range"
    : "default-range";

  return {
    from,
    to,
    seasonId: null,
    seasonName: null,
    source,
    label:
      source === "explicit-range"
        ? "Benutzerdefinierter Zeitraum"
        : `Standard (${MATCHCENTER_DEFAULT_FUTURE_DAYS} Tage ab heute)`,
    pageSize,
  };
}

/**
 * Spielplanung list query window derived from schedule scope (not the list month filter).
 */
export function resolveMatchcenterSpielplanungQueryWindow(input: {
  scope: MatchcenterSpielplanScheduleScope;
  skip?: number;
  limit?: number;
}): MatchcenterSpielplanungQueryWindow {
  return {
    from: input.scope.from,
    to: input.scope.to,
    limit: input.limit ?? input.scope.pageSize,
    skip: input.skip ?? 0,
    enforceMaxWindow: false,
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

export function deriveSpielplanMonthChipsFromAnchors(
  anchors: readonly MatchcenterScheduleAnchor[],
  locale: string,
  timeZone: string,
): SpielplanMonthChip[] {
  return deriveSpielplanMonthChips(
    anchors.map((anchor) => ({
      match: { startAt: anchor.startAt } as MatchcenterMatchSummary,
    })),
    locale,
    timeZone,
  );
}

/**
 * Month chips for months that contain at least one row in the unfiltered upcoming set.
 */
export function deriveSpielplanMonthChips(
  rows: readonly Pick<MatchcenterRowViewModel, "match">[],
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

export function mergeMatchcenterMatchesPages(
  pages: readonly MatchcenterMatchSummary[][],
): MatchcenterMatchSummary[] {
  if (pages.length === 0) {
    return [];
  }
  return mergeMatchcenterMatchesById(pages[0]!, pages.slice(1).flat());
}

export type SpielplanungPaginationState = {
  total: number;
  hasMore: boolean;
  loadedCount: number;
  limit: number;
};

export function toSpielplanungPaginationState(input: {
  total: number;
  hasMore: boolean;
  loadedCount: number;
  limit: number;
}): SpielplanungPaginationState {
  return input;
}
