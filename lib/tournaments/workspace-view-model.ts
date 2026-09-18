/**
 * lib/tournaments/workspace-view-model.ts
 *
 * TOURNAMENT-CENTER-UX-01 — deterministic tournament workspace derivation:
 * raw → time scope → search → filters → sort → grouping → presentation rows.
 *
 * Pure, synchronous, no I/O.
 */

import { resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import type { TournamentDto, TournamentStatus } from "./types";
import {
  assessTournamentOperationalState,
  isTournamentInArchivList,
  type TournamentOperationalAssessment,
} from "./operational-state";
import { getTournamentParticipatingTeams, tournamentMatchesTeamFilter } from "./team-participation";
import type { TournamentActionFilter } from "./view-model";

export type TournamentTimeScope = "UPCOMING" | "PAST" | "ALL";
export type TournamentGroupMode = "NONE" | "DATE" | "MONTH" | "TEAM";
export type TournamentSortMode = "DATE_ASC" | "DATE_DESC" | "TITLE";

export type TournamentWorkspaceRow = {
  tournament: TournamentDto;
  assessment: TournamentOperationalAssessment;
  /** YYYY-MM-DD in tenant timezone — used for date grouping/filtering. */
  calendarDateKey: string;
  /** YYYY-MM in tenant timezone. */
  calendarMonthKey: string;
};

export type TournamentWorkspaceGroup = {
  key: string;
  heading: string;
  subheading?: string;
  count: number;
  rows: TournamentWorkspaceRow[];
};

export type TournamentWorkspaceSummary = {
  upcoming: number;
  /** Upcoming tournaments whose start falls within the next three calendar months. */
  upcomingWithin3Months: number;
  thisMonth: number;
  teamsInvolved: number;
  past: number;
  total: number;
  uniqueVenues: number;
};

export type TournamentWorkspaceViewModel = {
  summary: TournamentWorkspaceSummary;
  groups: TournamentWorkspaceGroup[];
  totalMatching: number;
  emptyKind: "none" | "no_data" | "no_scope" | "filtered";
};

export type TournamentListView = "LISTE" | "KOMPAKT" | "KALENDER";

export type TournamentWorkspaceQuery = {
  scope: TournamentTimeScope;
  search: string;
  teamFilter: string | null;
  monthParam: string | null;
  statusFilter: TournamentStatus | null;
  actionFilter: TournamentActionFilter;
  group: TournamentGroupMode;
  sort: TournamentSortMode;
  categoryFilter: string | null;
  ageFilter: string | null;
  locationFilter: string | null;
  ownOnly: boolean;
  publicOnly: boolean;
  listView: TournamentListView;
};

const GROUP_VALUES: TournamentGroupMode[] = ["NONE", "DATE", "MONTH", "TEAM"];
const SORT_VALUES: TournamentSortMode[] = ["DATE_ASC", "DATE_DESC", "TITLE"];
const SCOPE_VALUES: TournamentTimeScope[] = ["UPCOMING", "PAST", "ALL"];

export function normalizeTournamentTimeScope(value: string | null | undefined): TournamentTimeScope {
  const upper = value?.trim().toUpperCase() ?? "";
  if (upper === "PAST" || upper === "VERGANGEN") return "PAST";
  if (upper === "ALL" || upper === "ALLE") return "ALL";
  return "UPCOMING";
}

export function normalizeTournamentGroupMode(value: string | null | undefined): TournamentGroupMode {
  const upper = value?.trim().toUpperCase() ?? "";
  if (upper === "NONE" || upper === "KEINE") return "NONE";
  if (upper === "DATE" || upper === "DATUM") return "DATE";
  if (upper === "MONTH" || upper === "MONAT") return "MONTH";
  if (upper === "TEAM") return "TEAM";
  return "MONTH";
}

export function normalizeTournamentListView(value: string | null | undefined): TournamentListView {
  const upper = value?.trim().toUpperCase() ?? "";
  if (upper === "KOMPAKT") return "KOMPAKT";
  if (upper === "KALENDER") return "KALENDER";
  return "LISTE";
}

export function normalizeTournamentSortMode(
  value: string | null | undefined,
  scope: TournamentTimeScope,
): TournamentSortMode {
  const upper = value?.trim().toUpperCase().replace(/-/g, "_") ?? "";
  if (upper === "DATE_DESC" || upper === "DESC") return "DATE_DESC";
  if (upper === "TITLE" || upper === "NAME") return "TITLE";
  if (upper === "DATE_ASC" || upper === "ASC") return "DATE_ASC";
  return scope === "PAST" ? "DATE_DESC" : "DATE_ASC";
}

function getZonedDateParts(iso: string, timeZone: string): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(iso));
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

export function toCalendarDateKey(iso: string, timeZone: string): string {
  const { year, month, day } = getZonedDateParts(iso, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function toCalendarMonthKey(iso: string, timeZone: string): string {
  const { year, month } = getZonedDateParts(iso, timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function defaultSortForScope(scope: TournamentTimeScope): TournamentSortMode {
  return scope === "PAST" ? "DATE_DESC" : "DATE_ASC";
}

function compareRows(a: TournamentWorkspaceRow, b: TournamentWorkspaceRow, sort: TournamentSortMode): number {
  if (sort === "TITLE") {
    return a.tournament.title.localeCompare(b.tournament.title, "de");
  }

  const delta = new Date(a.tournament.startAt).getTime() - new Date(b.tournament.startAt).getTime();
  return sort === "DATE_DESC" ? -delta : delta;
}

function tournamentMatchesSearch(tournament: TournamentDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (tournament.title.toLowerCase().includes(q)) return true;
  if (tournament.location?.toLowerCase().includes(q)) return true;
  if (tournament.organizerName?.toLowerCase().includes(q)) return true;
  if (tournament.competitionLabel?.toLowerCase().includes(q)) return true;

  for (const team of getTournamentParticipatingTeams(tournament)) {
    if (team.name.toLowerCase().includes(q)) return true;
  }

  for (const participant of tournament.participants) {
    if (participant.displayName.toLowerCase().includes(q)) return true;
  }

  return false;
}

function tournamentMatchesCategoryFilter(
  tournament: Pick<TournamentDto, "participants" | "team">,
  categoryFilter: string,
): boolean {
  const target = categoryFilter.trim().toUpperCase();
  return getTournamentParticipatingTeams(tournament).some(
    (team) => team.category.trim().toUpperCase() === target,
  );
}

function tournamentMatchesAgeFilter(
  tournament: Pick<TournamentDto, "participants" | "team">,
  ageFilter: string,
): boolean {
  const target = ageFilter.trim().toUpperCase();
  return getTournamentParticipatingTeams(tournament).some((team) => {
    const age = team.ageGroup?.trim().toUpperCase() ?? "";
    return age === target;
  });
}

function tournamentMatchesLocationFilter(tournament: Pick<TournamentDto, "location">, locationFilter: string): boolean {
  const target = locationFilter.trim().toLowerCase();
  const location = tournament.location?.trim().toLowerCase() ?? "";
  return location === target;
}

function tournamentMatchesOwnOnly(tournament: Pick<TournamentDto, "homeAway">): boolean {
  return tournament.homeAway === "HOME";
}

function tournamentMatchesPublicOnly(tournament: Pick<TournamentDto, "visibility">): boolean {
  return tournament.visibility.websiteVisible;
}

function isUpcoming(tournament: TournamentDto, now: Date): boolean {
  return !isTournamentInArchivList(tournament, now);
}

function isPast(tournament: TournamentDto, now: Date): boolean {
  return isTournamentInArchivList(tournament, now);
}

function matchesScope(tournament: TournamentDto, scope: TournamentTimeScope, now: Date): boolean {
  if (scope === "ALL") return true;
  if (scope === "UPCOMING") return isUpcoming(tournament, now);
  return isPast(tournament, now);
}

function formatDateGroupHeading(dateKey: string, locale: string, timeZone: string, now: Date): string {
  const todayKey = toCalendarDateKey(now.toISOString(), timeZone);
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const tomorrowKey = toCalendarDateKey(tomorrow.toISOString(), timeZone);

  if (dateKey === todayKey) {
    return "Heute";
  }
  if (dateKey === tomorrowKey) {
    return "Morgen";
  }

  const parsed = new Date(`${dateKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(parsed);
}

function formatMonthGroupHeading(monthKey: string, locale: string, timeZone: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, 15, 12));
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone,
  }).format(parsed);
}

function addCalendarMonths(base: Date, months: number, timeZone: string): Date {
  const parts = getZonedDateParts(base.toISOString(), timeZone);
  const monthIndex = parts.month - 1 + months;
  const year = parts.year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  return new Date(Date.UTC(year, month, 15, 12));
}

function buildSummary(
  tournaments: readonly TournamentDto[],
  now: Date,
  timeZone: string,
): TournamentWorkspaceSummary {
  const thisMonthKey = toCalendarMonthKey(now.toISOString(), timeZone);
  const threeMonthHorizon = addCalendarMonths(now, 3, timeZone);
  const teamIds = new Set<string>();
  const venueKeys = new Set<string>();

  let upcoming = 0;
  let upcomingWithin3Months = 0;
  let past = 0;
  let thisMonth = 0;

  for (const tournament of tournaments) {
    const locationKey = tournament.location?.trim().toLowerCase();
    if (locationKey) {
      venueKeys.add(locationKey);
    }

    const upcomingRow = isUpcoming(tournament, now);
    if (upcomingRow) {
      upcoming += 1;
      const start = new Date(tournament.startAt);
      if (start.getTime() <= threeMonthHorizon.getTime()) {
        upcomingWithin3Months += 1;
      }
      if (toCalendarMonthKey(tournament.startAt, timeZone) === thisMonthKey) {
        thisMonth += 1;
      }
    } else {
      past += 1;
    }

    for (const team of getTournamentParticipatingTeams(tournament)) {
      teamIds.add(team.id);
    }
  }

  return {
    upcoming,
    upcomingWithin3Months,
    thisMonth,
    teamsInvolved: teamIds.size,
    past,
    total: tournaments.length,
    uniqueVenues: venueKeys.size,
  };
}

export function buildTournamentWorkspaceViewModel(
  tournaments: readonly TournamentDto[],
  query: TournamentWorkspaceQuery,
  options: { now?: Date; timeZone?: string; locale?: string } = {},
): TournamentWorkspaceViewModel {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? "Europe/Zurich";
  const locale = options.locale ?? "de-CH";
  const sort = query.sort ?? defaultSortForScope(query.scope);

  const summary = buildSummary(tournaments, now, timeZone);

  if (tournaments.length === 0) {
    return { summary, groups: [], totalMatching: 0, emptyKind: "no_data" };
  }

  let monthWindow: { from: Date; to: Date } | null = null;
  if (query.monthParam) {
    monthWindow = resolveMatchcenterMonthWindow({ monthParam: query.monthParam, timeZone });
  }

  const scopedRows: TournamentWorkspaceRow[] = [];

  for (const tournament of tournaments) {
    if (!matchesScope(tournament, query.scope, now)) continue;

    const row: TournamentWorkspaceRow = {
      tournament,
      assessment: assessTournamentOperationalState(tournament),
      calendarDateKey: toCalendarDateKey(tournament.startAt, timeZone),
      calendarMonthKey: toCalendarMonthKey(tournament.startAt, timeZone),
    };

    if (!tournamentMatchesSearch(tournament, query.search)) continue;
    if (query.teamFilter && !tournamentMatchesTeamFilter(tournament, query.teamFilter)) continue;
    if (query.statusFilter && tournament.status !== query.statusFilter) continue;
    if (query.categoryFilter && !tournamentMatchesCategoryFilter(tournament, query.categoryFilter)) {
      continue;
    }
    if (query.ageFilter && !tournamentMatchesAgeFilter(tournament, query.ageFilter)) {
      continue;
    }
    if (query.locationFilter && !tournamentMatchesLocationFilter(tournament, query.locationFilter)) {
      continue;
    }
    if (query.ownOnly && !tournamentMatchesOwnOnly(tournament)) {
      continue;
    }
    if (query.publicOnly && !tournamentMatchesPublicOnly(tournament)) {
      continue;
    }
    if (monthWindow) {
      const start = new Date(tournament.startAt);
      if (start.getTime() < monthWindow.from.getTime() || start.getTime() > monthWindow.to.getTime()) {
        continue;
      }
    }

    if (query.scope === "UPCOMING" && query.actionFilter === "OFFEN" && row.assessment.status !== "OPEN") {
      continue;
    }
    if (
      query.scope === "UPCOMING" &&
      query.actionFilter === "ERLEDIGT" &&
      row.assessment.status === "OPEN"
    ) {
      continue;
    }

    scopedRows.push(row);
  }

  if (scopedRows.length === 0) {
    const hasAnyInScope = tournaments.some((t) => matchesScope(t, query.scope, now));
    if (!hasAnyInScope) {
      return { summary, groups: [], totalMatching: 0, emptyKind: "no_scope" };
    }
    return { summary, groups: [], totalMatching: 0, emptyKind: "filtered" };
  }

  const sorted = [...scopedRows].sort((a, b) => compareRows(a, b, sort));

  if (query.group === "NONE") {
    return {
      summary,
      totalMatching: sorted.length,
      emptyKind: "none",
      groups: [
        {
          key: "all",
          heading: "",
          count: sorted.length,
          rows: sorted,
        },
      ],
    };
  }

  if (query.group === "DATE") {
    const byDate = new Map<string, TournamentWorkspaceRow[]>();
    for (const row of sorted) {
      const list = byDate.get(row.calendarDateKey) ?? [];
      list.push(row);
      byDate.set(row.calendarDateKey, list);
    }

    const dateKeys = [...byDate.keys()].sort((a, b) => {
      if (sort === "DATE_DESC") return b.localeCompare(a);
      return a.localeCompare(b);
    });

    const groups: TournamentWorkspaceGroup[] = dateKeys.map((dateKey) => {
      const rows = byDate.get(dateKey)!;
      rows.sort((a, b) => compareRows(a, b, sort));
      return {
        key: dateKey,
        heading: formatDateGroupHeading(dateKey, locale, timeZone, now),
        count: rows.length,
        rows,
      };
    });

    return { summary, groups, totalMatching: sorted.length, emptyKind: "none" };
  }

  if (query.group === "MONTH") {
    const byMonth = new Map<string, TournamentWorkspaceRow[]>();
    for (const row of sorted) {
      const list = byMonth.get(row.calendarMonthKey) ?? [];
      list.push(row);
      byMonth.set(row.calendarMonthKey, list);
    }

    const monthKeys = [...byMonth.keys()].sort((a, b) => {
      if (sort === "DATE_DESC") return b.localeCompare(a);
      return a.localeCompare(b);
    });

    const groups: TournamentWorkspaceGroup[] = monthKeys.map((monthKey) => {
      const rows = byMonth.get(monthKey)!;
      rows.sort((a, b) => compareRows(a, b, sort));
      return {
        key: monthKey,
        heading: formatMonthGroupHeading(monthKey, locale, timeZone),
        count: rows.length,
        rows,
      };
    });

    return { summary, groups, totalMatching: sorted.length, emptyKind: "none" };
  }

  // TEAM grouping — tournament may appear under each participating team.
  const byTeam = new Map<string, { label: string; rows: TournamentWorkspaceRow[] }>();

  for (const row of sorted) {
    const teams = getTournamentParticipatingTeams(row.tournament);
    if (teams.length === 0) {
      const bucket = byTeam.get("__none__") ?? { label: "Ohne Mannschaft", rows: [] };
      bucket.rows.push(row);
      byTeam.set("__none__", bucket);
      continue;
    }

    for (const team of teams) {
      const bucket = byTeam.get(team.id) ?? { label: team.name, rows: [] };
      bucket.rows.push(row);
      byTeam.set(team.id, bucket);
    }
  }

  const teamEntries = [...byTeam.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label, "de"));

  const groups: TournamentWorkspaceGroup[] = teamEntries.map(([teamId, bucket]) => {
    const rows = [...bucket.rows].sort((a, b) => compareRows(a, b, sort));
    return {
      key: teamId,
      heading: bucket.label,
      count: rows.length,
      rows,
    };
  });

  return { summary, groups, totalMatching: sorted.length, emptyKind: "none" };
}

export function isValidGroupMode(value: string): value is TournamentGroupMode {
  return GROUP_VALUES.includes(value as TournamentGroupMode);
}

export function isValidSortMode(value: string): value is TournamentSortMode {
  return SORT_VALUES.includes(value as TournamentSortMode);
}

export function isValidTimeScope(value: string): value is TournamentTimeScope {
  return SCOPE_VALUES.includes(value as TournamentTimeScope);
}
