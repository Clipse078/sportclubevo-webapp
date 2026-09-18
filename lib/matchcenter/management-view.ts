/**
 * SPIELE-UX-01 — client/server-safe helpers for Spiele management overview:
 * search, sort, date grouping, compact readiness, and status presentation.
 */

import type { MatchcenterMatchSummary } from "./types";
import {
  assessMatchOperationalState,
  type MatchcenterOperationalAssessment,
} from "./operational-state";
import type { MatchcenterRowViewModel } from "./view-model";
import { getMatchcenterLifecycleClassification } from "./match-lifecycle";
import { isMatchLive } from "./match-lifecycle";
import { resolveMatchcenterCompactSideName } from "./team-display";
import type { SpieleHomeAwayFilter, SpieleStatusMaskKey } from "./navigation";

export type SpieleManagementSort = "KICKOFF_ASC" | "KICKOFF_DESC";

export function parseSpieleManagementSort(
  value: string | null | undefined,
): SpieleManagementSort {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized === "KICKOFF_DESC" ? "KICKOFF_DESC" : "KICKOFF_ASC";
}

export function normalizeSpieleSearchQuery(
  value: string | null | undefined,
): string {
  return value?.trim() ?? "";
}

function sideSearchText(side: MatchcenterMatchSummary["home"]): string {
  return [
    side.displayName,
    side.canonicalTeamName,
    side.providerTeamName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchMatchesSpieleSearch(
  match: MatchcenterMatchSummary,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    match.title,
    match.competitionLabel,
    match.location,
    sideSearchText(match.home),
    sideSearchText(match.away),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function filterSpielplanungRowsBySearch(
  rows: readonly MatchcenterRowViewModel[],
  query: string,
): MatchcenterRowViewModel[] {
  const normalized = query.trim();
  if (!normalized) return [...rows];
  return rows.filter((row) => matchMatchesSpieleSearch(row.match, normalized));
}

export function filterResultateBySearch(
  matches: readonly MatchcenterMatchSummary[],
  query: string,
): MatchcenterMatchSummary[] {
  const normalized = query.trim();
  if (!normalized) return [...matches];
  return matches.filter((match) => matchMatchesSpieleSearch(match, normalized));
}

export function sortSpielplanungRows(
  rows: readonly MatchcenterRowViewModel[],
  sort: SpieleManagementSort,
): MatchcenterRowViewModel[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const delta = a.match.startAt.getTime() - b.match.startAt.getTime();
    return sort === "KICKOFF_DESC" ? -delta : delta;
  });
  return copy;
}

export function sortResultateMatches(
  matches: readonly MatchcenterMatchSummary[],
  sort: SpieleManagementSort,
): MatchcenterMatchSummary[] {
  const copy = [...matches];
  copy.sort((a, b) => {
    const delta = b.startAt.getTime() - a.startAt.getTime();
    return sort === "KICKOFF_ASC" ? -delta : delta;
  });
  return copy;
}

export type SpieleDayGroup<T> = {
  dayKey: string;
  label: string;
  rows: T[];
};

/** Target-style date group heading, e.g. "FR, 18. SEPTEMBER 2026". */
export function formatSpieleDayGroupHeadingLong(
  date: Date,
  locale: string,
  timezone: string,
  now?: Date,
): string {
  const referenceNow = now ?? new Date();
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceNow);
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  if (dayKey === todayKey) {
    return "HEUTE";
  }

  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: timezone,
  })
    .format(date)
    .replace(/\.$/, "")
    .toUpperCase();

  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: timezone,
  }).format(date);

  const month = new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: timezone,
  })
    .format(date)
    .toUpperCase();

  const year = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    timeZone: timezone,
  }).format(date);

  return `${weekday}, ${day}. ${month} ${year}`;
}

export function formatSpieleDayGroupLabel(
  date: Date,
  locale: string,
  timezone: string,
  now?: Date,
): string {
  const referenceNow = now ?? new Date();
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceNow);
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  if (dayKey === todayKey) {
    return "HEUTE";
  }

  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: timezone,
  })
    .format(date)
    .replace(/\.$/, "")
    .toUpperCase();

  const day = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    timeZone: timezone,
  }).format(date);

  const month = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: timezone,
  })
    .format(date)
    .replace(/\.$/, "")
    .toUpperCase();

  return `${weekday} ${day}. ${month}`;
}

function dayKeyForDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function groupSpielplanungRowsByDay(
  rows: readonly MatchcenterRowViewModel[],
  locale: string,
  timezone: string,
  now?: Date,
): SpieleDayGroup<MatchcenterRowViewModel>[] {
  const groups = new Map<string, { date: Date; rows: MatchcenterRowViewModel[] }>();

  for (const row of rows) {
    const dayKey = dayKeyForDate(row.match.startAt, timezone);
    if (!groups.has(dayKey)) {
      groups.set(dayKey, { date: row.match.startAt, rows: [] });
    }
    groups.get(dayKey)!.rows.push(row);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, group]) => ({
      dayKey,
      label: formatSpieleDayGroupLabel(group.date, locale, timezone, now),
      rows: group.rows,
    }));
}

export function groupResultateByDay(
  matches: readonly MatchcenterMatchSummary[],
  locale: string,
  timezone: string,
  now?: Date,
): SpieleDayGroup<MatchcenterMatchSummary>[] {
  const groups = new Map<string, { date: Date; rows: MatchcenterMatchSummary[] }>();

  for (const match of matches) {
    const dayKey = dayKeyForDate(match.startAt, timezone);
    if (!groups.has(dayKey)) {
      groups.set(dayKey, { date: match.startAt, rows: [] });
    }
    groups.get(dayKey)!.rows.push(match);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, group]) => ({
      dayKey,
      label: formatSpieleDayGroupLabel(group.date, locale, timezone, now),
      rows: group.rows,
    }));
}

export type SpieleStatusPresentation = {
  label: string;
  dotClassName: string;
  badgeClassName: string;
  detailLine: string | null;
};

export function buildHomeResourceDetailLine(
  match: MatchcenterMatchSummary,
): string | null {
  const homeAway = match.homeAway?.trim().toUpperCase();
  if (homeAway !== "HOME") return null;

  const parts: string[] = [];
  if (match.location?.trim()) {
    parts.push(match.location.trim());
  }
  if (match.operational.pitchCode?.trim()) {
    parts.push(match.operational.pitchCode.trim());
  }

  const dressing = [
    match.operational.homeDressingRoomCode?.trim(),
    match.operational.awayDressingRoomCode?.trim(),
  ].filter(Boolean);
  if (dressing.length > 0) {
    parts.push(`Garderobe ${dressing.join(" / ")}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function buildCompactReadinessDetailLine(
  match: MatchcenterMatchSummary,
  assessment: MatchcenterOperationalAssessment,
): string | null {
  if (assessment.status === "AWAY") {
    return match.location?.trim() || null;
  }
  if (assessment.status !== "OPEN" && assessment.status !== "READY") {
    return null;
  }

  const homeAway = match.homeAway?.trim().toUpperCase();
  if (homeAway !== "HOME") return null;

  const pitchReady = !!match.operational.pitchCode?.trim();
  const homeDr = !!match.operational.homeDressingRoomCode?.trim();
  const awayDr = !!match.operational.awayDressingRoomCode?.trim();

  const segments = [
    `Platz ${pitchReady ? "✓" : "—"}`,
    `Garderobe ${homeDr && awayDr ? "✓" : "—"}`,
  ];

  return segments.join(" · ");
}

export function resolveSpieleStatusPresentation(
  match: MatchcenterMatchSummary,
  assessment: MatchcenterOperationalAssessment,
  now?: Date,
): SpieleStatusPresentation {
  if (isMatchLive(match)) {
    return {
      label: "Live",
      dotClassName: "bg-emerald-500",
      badgeClassName: "bg-emerald-500/10 text-emerald-700",
      detailLine: null,
    };
  }

  const lifecycle = getMatchcenterLifecycleClassification(match, now).lifecycle;
  if (lifecycle === "POSTPONED") {
    return {
      label: "Verschoben",
      dotClassName: "bg-amber-500",
      badgeClassName: "bg-amber-500/10 text-amber-800",
      detailLine: null,
    };
  }
  if (lifecycle === "CANCELLED") {
    return {
      label: "Abgesagt",
      dotClassName: "bg-red-500",
      badgeClassName: "bg-red-500/10 text-red-700",
      detailLine: null,
    };
  }
  if (lifecycle === "COMPLETED") {
    return {
      label: "Gespielt",
      dotClassName: "bg-emerald-500",
      badgeClassName: "bg-emerald-500/10 text-emerald-700",
      detailLine: null,
    };
  }

  if (assessment.teamUnresolved) {
    return {
      label: "Team offen",
      dotClassName: "bg-amber-500",
      badgeClassName: "bg-amber-500/10 text-amber-800",
      detailLine: null,
    };
  }

  if (assessment.status === "AWAY") {
    return {
      label: "Auswärtsspiel",
      dotClassName: "bg-[var(--muted)]",
      badgeClassName: "bg-[var(--surface-2)] text-[var(--text-2)]",
      detailLine: buildCompactReadinessDetailLine(match, assessment),
    };
  }

  if (assessment.status === "READY") {
    return {
      label: "Bereit",
      dotClassName: "bg-emerald-500",
      badgeClassName: "bg-emerald-500/10 text-emerald-700",
      detailLine: buildCompactReadinessDetailLine(match, assessment),
    };
  }

  if (assessment.status === "OPEN") {
    const count = assessment.actionCount;
    return {
      label:
        count === 1 ? "1 Punkt offen" : `${count} Punkte offen`,
      dotClassName: "bg-amber-500",
      badgeClassName: "bg-amber-500/10 text-amber-800",
      detailLine: buildCompactReadinessDetailLine(match, assessment),
    };
  }

  return {
    label: "Offen",
    dotClassName: "bg-[var(--muted)]",
    badgeClassName: "bg-[var(--surface-2)] text-[var(--text-2)]",
    detailLine: null,
  };
}

export function formatSpieleKickoffTime(
  date: Date,
  locale: string,
  timezone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export function formatSpieleKickoffDateShort(
  date: Date,
  locale: string,
  timezone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export function resolveOwnTeamSideLabel(match: MatchcenterMatchSummary): string | null {
  if (match.home.isOwnTeam) {
    return resolveMatchcenterCompactSideName(match.home);
  }
  if (match.away.isOwnTeam) {
    return resolveMatchcenterCompactSideName(match.away);
  }
  return null;
}

export type SpieleReadinessChecklistItem = {
  key: string;
  label: string;
  value: string | null;
  ready: boolean;
};

export function buildHomeReadinessChecklist(
  match: MatchcenterMatchSummary,
): SpieleReadinessChecklistItem[] {
  return [
    {
      key: "pitch",
      label: "Spielfeld",
      value: match.operational.pitchCode?.trim() || null,
      ready: !!match.operational.pitchCode?.trim(),
    },
    {
      key: "home-dressing",
      label: "Heimkabine",
      value: match.operational.homeDressingRoomCode?.trim() || null,
      ready: !!match.operational.homeDressingRoomCode?.trim(),
    },
    {
      key: "away-dressing",
      label: "Gastkabine",
      value: match.operational.awayDressingRoomCode?.trim() || null,
      ready: !!match.operational.awayDressingRoomCode?.trim(),
    },
    {
      key: "infoboard",
      label: "Infoboard",
      value: match.visibility.infoboardVisible ? "✓" : null,
      ready: match.visibility.infoboardVisible,
    },
  ];
}

export function resolveSpieleRowStatusBucket(
  row: MatchcenterRowViewModel,
  now?: Date,
): SpieleStatusMaskKey {
  const lifecycle = getMatchcenterLifecycleClassification(row.match, now).lifecycle;
  if (lifecycle === "CANCELLED") return "abgesagt";
  if (row.assessment.status === "OPEN") return "offen";
  if (row.assessment.status === "READY") return "bereit";
  return "anstehend";
}

export function filterSpielplanungRowsByStatusMask(
  rows: readonly MatchcenterRowViewModel[],
  mask: readonly SpieleStatusMaskKey[],
  now?: Date,
): MatchcenterRowViewModel[] {
  const allowed = new Set(mask);
  if (allowed.size === 0) return [];
  return rows.filter((row) => allowed.has(resolveSpieleRowStatusBucket(row, now)));
}

export function filterSpielplanungRowsByHomeAway(
  rows: readonly MatchcenterRowViewModel[],
  filter: SpieleHomeAwayFilter,
): MatchcenterRowViewModel[] {
  if (filter === "ALLE") return [...rows];
  const want = filter === "HOME" ? "HOME" : "AWAY";
  return rows.filter(
    (row) => row.match.homeAway?.trim().toUpperCase() === want,
  );
}

export function filterSpielplanungRowsByCompetition(
  rows: readonly MatchcenterRowViewModel[],
  competition: string | null,
): MatchcenterRowViewModel[] {
  const needle = competition?.trim();
  if (!needle) return [...rows];
  return rows.filter((row) => row.match.competitionLabel?.trim() === needle);
}

export function filterSpielplanungRowsByVenue(
  rows: readonly MatchcenterRowViewModel[],
  venue: string | null,
): MatchcenterRowViewModel[] {
  const needle = venue?.trim();
  if (!needle) return [...rows];
  return rows.filter((row) => row.match.location?.trim() === needle);
}

export function deriveSpieleCompetitionOptions(
  rows: readonly MatchcenterRowViewModel[],
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const label = row.match.competitionLabel?.trim();
    if (label) set.add(label);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "de"));
}

export function deriveSpieleVenueOptions(
  rows: readonly MatchcenterRowViewModel[],
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const loc = row.match.location?.trim();
    if (loc) set.add(loc);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "de"));
}

export function countSpieleStatusBuckets(
  rows: readonly MatchcenterRowViewModel[],
  cancelledCount: number,
  now?: Date,
): Record<SpieleStatusMaskKey, number> {
  const counts: Record<SpieleStatusMaskKey, number> = {
    anstehend: 0,
    offen: 0,
    bereit: 0,
    abgesagt: cancelledCount,
  };
  for (const row of rows) {
    const bucket = resolveSpieleRowStatusBucket(row, now);
    if (bucket !== "abgesagt") counts[bucket] += 1;
  }
  return counts;
}

export function countCancelledMatchesInMonth(
  matches: readonly MatchcenterMatchSummary[],
  now?: Date,
): number {
  return buildCancelledSpielplanungRows(matches, now).length;
}

export function buildCancelledSpielplanungRows(
  matches: readonly MatchcenterMatchSummary[],
  now?: Date,
): MatchcenterRowViewModel[] {
  const rows: MatchcenterRowViewModel[] = [];
  for (const match of matches) {
    const lifecycle = getMatchcenterLifecycleClassification(match, now).lifecycle;
    if (lifecycle === "CANCELLED") {
      rows.push({
        match,
        assessment: assessMatchOperationalState(match, now),
      });
    }
  }
  return rows.sort(
    (a, b) => a.match.startAt.getTime() - b.match.startAt.getTime(),
  );
}

export function formatSpieleEndTime(
  date: Date | null | undefined,
  locale: string,
  timezone: string,
): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export function resolveSpieleOperationalEndTime(
  match: MatchcenterMatchSummary,
): Date | null {
  if (match.operationalEndAt) return match.operationalEndAt;
  if (match.endAt) return match.endAt;
  return null;
}

export function buildSpieleTeamContextLine(match: MatchcenterMatchSummary): string | null {
  const ownTeam = resolveOwnTeamSideLabel(match);
  const competition = match.competitionLabel?.trim();
  if (ownTeam && competition) return `${ownTeam} · ${competition}`;
  return ownTeam ?? competition ?? null;
}

export function buildSpieleVenueLine(match: MatchcenterMatchSummary): string | null {
  const location = match.location?.trim();
  const pitch = match.operational.pitchCode?.trim();
  if (location && pitch) return `${location} · ${pitch}`;
  return location ?? pitch ?? null;
}
