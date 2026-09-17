/**
 * SCE-TRAININGS-UX-01 / TRAININGS-UX-01J2 — team-grouped Trainings management rows.
 */

import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import {
  COCKPIT_WEEKDAY_LABELS,
  COCKPIT_WEEKDAY_ORDER,
  resolveSeriesAllocationDisplay,
} from "@/lib/training/series-cockpit";
import type { TrainingAllocationDto, TrainingSeriesDto, TrainingSeriesStatus, Weekday } from "@/lib/training/types";

const WEEKDAY_SHORT: Record<Weekday, string> = {
  MONDAY: "Mo",
  TUESDAY: "Di",
  WEDNESDAY: "Mi",
  THURSDAY: "Do",
  FRIDAY: "Fr",
  SATURDAY: "Sa",
  SUNDAY: "So",
};

export type TrainingSeriesSchedulePresentation =
  | { kind: "uniform"; rhythmLabel: string; timeLabel: string }
  | { kind: "variable"; rhythmLabel: string; timeLines: string[] };

export const TRAINING_MANAGEMENT_SERIES_PAGE_SIZE = 10;

export const MANAGEMENT_WEEKDAY_SHORT: Record<Weekday, string> = WEEKDAY_SHORT;

export type TrainingSeriesManagementSort =
  | "UPDATED_DESC"
  | "TITLE_ASC"
  | "TEAM_ASC"
  | "WEEKDAY"
  | "START_TIME";

export type TrainingSeriesManagementSeriesEntry = {
  seriesId: string;
  title: string;
  weekdays: Weekday[];
  timeLabel: string;
  timeLines: string[] | null;
  actionLabel: string;
  status: TrainingSeriesStatus;
  updatedAt: string;
};

export type TrainingSeriesManagementRow = {
  /** Primary series id for stable keys/tests when exactly one series; otherwise first series id. */
  seriesId: string;
  teamSeasonId: string;
  title: string;
  contextLabel: string;
  teamDisplayName: string;
  weekdays: Weekday[];
  rhythmLabel: string;
  timeLabel: string;
  timeLines: string[] | null;
  timeDetailLines: string[] | null;
  sortStartTime: string;
  facilityLabel: string | null;
  facilityExtraCount: number;
  facilityLabels: string[];
  status: TrainingSeriesStatus;
  planningStage: string;
  validFrom: string | null;
  validUntil: string | null;
  sessionCount: number;
  updatedAt: string;
  seriesEntries: TrainingSeriesManagementSeriesEntry[];
};

export type TrainingSeriesManagementFilters = {
  search?: string;
  teamSeasonId?: string | null;
  status?: TrainingSeriesStatus | "ALL" | "ACTIVE_ONLY";
};

type PerSeriesRow = {
  seriesId: string;
  teamSeasonId: string;
  title: string;
  teamDisplayName: string;
  weekdays: Weekday[];
  rhythmLabel: string;
  timeLabel: string;
  timeLines: string[] | null;
  sortStartTime: string;
  facilityLabel: string | null;
  facilityExtraCount: number;
  facilityLabels: string[];
  status: TrainingSeriesStatus;
  planningStage: string;
  validFrom: string | null;
  validUntil: string | null;
  sessionCount: number;
  updatedAt: string;
  actionLabel: string;
};

function normalizeSearch(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function resolveSchedulePresentation(series: TrainingSeriesDto): TrainingSeriesSchedulePresentation {
  const schedules = [...series.weekdaySchedules].sort(
    (a, b) => COCKPIT_WEEKDAY_ORDER.indexOf(a.weekday) - COCKPIT_WEEKDAY_ORDER.indexOf(b.weekday),
  );

  const rhythmLabel =
    schedules.map((schedule) => WEEKDAY_SHORT[schedule.weekday]).join(" · ") || "—";

  const timeKeys = new Set(schedules.map((s) => `${s.startsAt}–${s.endsAt}`));
  if (timeKeys.size <= 1) {
    const first = schedules[0];
    const timeLabel = first
      ? `${first.startsAt}–${first.endsAt}`
      : `${series.startsAt}–${series.endsAt}`;
    return { kind: "uniform", rhythmLabel, timeLabel };
  }

  const timeLines = schedules.map(
    (schedule) => `${WEEKDAY_SHORT[schedule.weekday]} ${schedule.startsAt}–${schedule.endsAt}`,
  );
  return { kind: "variable", rhythmLabel, timeLines };
}

function resolveOrderedWeekdays(series: TrainingSeriesDto): Weekday[] {
  return [...series.weekdaySchedules]
    .sort(
      (a, b) => COCKPIT_WEEKDAY_ORDER.indexOf(a.weekday) - COCKPIT_WEEKDAY_ORDER.indexOf(b.weekday),
    )
    .map((schedule) => schedule.weekday);
}

function resolveSortStartTime(series: TrainingSeriesDto): string {
  const schedules = [...series.weekdaySchedules].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return schedules[0]?.startsAt ?? series.startsAt;
}

function buildCompactFacilityPresentation(allocations: readonly TrainingAllocationDto[]): {
  label: string | null;
  extraCount: number;
  labels: string[];
} {
  const pitches = allocations.filter(
    (allocation) => classifyFacilityResourceType(allocation.facilityResourceType) === "PITCH_HALL",
  );

  const labels = pitches
    .map((allocation) => allocation.facilityResourceName?.trim() || allocation.facilityResourceCode?.trim() || "")
    .filter((value) => value.length > 0);
  const unique = [...new Set(labels)];

  if (unique.length === 0) {
    const display = resolveSeriesAllocationDisplay(allocations);
    return { label: display.pitchName, extraCount: 0, labels: display.pitchName ? [display.pitchName] : [] };
  }

  if (unique.length === 1) {
    return { label: unique[0]!, extraCount: 0, labels: unique };
  }

  return { label: unique[0]!, extraCount: unique.length - 1, labels: unique };
}

function resolveSeriesActionLabel(series: TrainingSeriesDto): string {
  const schedules = [...series.weekdaySchedules].sort(
    (a, b) => COCKPIT_WEEKDAY_ORDER.indexOf(a.weekday) - COCKPIT_WEEKDAY_ORDER.indexOf(b.weekday),
  );
  if (schedules.length === 0) {
    return `${series.title} · ${series.startsAt}–${series.endsAt}`;
  }
  if (schedules.length === 1) {
    const schedule = schedules[0]!;
    return `${COCKPIT_WEEKDAY_LABELS[schedule.weekday]} · ${schedule.startsAt}–${schedule.endsAt}`;
  }
  const weekdayPart = schedules.map((s) => COCKPIT_WEEKDAY_LABELS[s.weekday]).join(", ");
  const timeKeys = new Set(schedules.map((s) => `${s.startsAt}–${s.endsAt}`));
  const timePart =
    timeKeys.size === 1
      ? `${schedules[0]!.startsAt}–${schedules[0]!.endsAt}`
      : "Unterschiedliche Zeiten";
  return `${weekdayPart} · ${timePart}`;
}

export function resolveTeamManagementPrimaryTitle(teamLabel: string, seriesTitles: readonly string[]): string {
  const trimmedTeam = teamLabel.trim();
  const canonical = trimmedTeam.length > 0 ? `${trimmedTeam} Training` : "Training";
  const uniqueTitles = [...new Set(seriesTitles.map((title) => title.trim()).filter(Boolean))];

  if (uniqueTitles.length === 1) {
    const only = uniqueTitles[0]!;
    const lowerOnly = only.toLowerCase();
    const lowerCanonical = canonical.toLowerCase();
    if (lowerOnly === lowerCanonical || lowerOnly === `${trimmedTeam.toLowerCase()} training training`) {
      return canonical;
    }
    if (lowerOnly.endsWith(" training") && lowerOnly.includes(trimmedTeam.toLowerCase())) {
      return only;
    }
    return only;
  }

  return canonical;
}

export function resolveTeamManagementContextLabel(tenantName: string, teamLabel: string): string {
  const tenant = tenantName.trim();
  const team = teamLabel.trim();
  if (tenant && team) return `${tenant} · ${team}`;
  return team || tenant || "—";
}

export function deriveGroupedTeamStatus(
  entries: readonly { status: TrainingSeriesStatus }[],
): TrainingSeriesStatus {
  if (entries.some((entry) => entry.status === "ACTIVE")) return "ACTIVE";
  if (entries.length > 0 && entries.every((entry) => entry.status === "ARCHIVED")) return "ARCHIVED";
  return "INACTIVE";
}

function mergeOrderedWeekdays(weekdaySets: readonly Weekday[][]): Weekday[] {
  const seen = new Set<Weekday>();
  const merged: Weekday[] = [];
  for (const weekday of COCKPIT_WEEKDAY_ORDER) {
    if (weekdaySets.some((set) => set.includes(weekday))) {
      if (!seen.has(weekday)) {
        seen.add(weekday);
        merged.push(weekday);
      }
    }
  }
  return merged;
}

function aggregateTeamTimePresentation(
  entries: readonly PerSeriesRow[],
): { timeLabel: string; timeLines: string[] | null; timeDetailLines: string[] | null } {
  const uniformLabels = new Set<string>();
  const detailLines = new Set<string>();

  for (const entry of entries) {
    if (entry.timeLines) {
      for (const line of entry.timeLines) detailLines.add(line);
    } else {
      uniformLabels.add(entry.timeLabel);
      for (const weekday of entry.weekdays) {
        detailLines.add(`${WEEKDAY_SHORT[weekday]} ${entry.timeLabel}`);
      }
    }
  }

  if (uniformLabels.size === 1 && detailLines.size <= entries.reduce((sum, e) => sum + e.weekdays.length, 0)) {
    const only = [...uniformLabels][0]!;
    const allSame = entries.every((entry) => !entry.timeLines && entry.timeLabel === only);
    if (allSame) {
      return { timeLabel: only, timeLines: null, timeDetailLines: null };
    }
  }

  if (detailLines.size === 0) {
    return { timeLabel: "—", timeLines: null, timeDetailLines: null };
  }

  const weekdayRank = (line: string): number => {
    const token = line.slice(0, 2);
    const index = Object.values(WEEKDAY_SHORT).indexOf(token as (typeof WEEKDAY_SHORT)[Weekday]);
    return index >= 0 ? index : 99;
  };
  const sortedDetails = [...detailLines].sort((a, b) => {
    const weekdayDiff = weekdayRank(a) - weekdayRank(b);
    return weekdayDiff !== 0 ? weekdayDiff : a.localeCompare(b, "de-CH");
  });
  return {
    timeLabel: "Unterschiedliche Zeiten",
    timeLines: null,
    timeDetailLines: sortedDetails,
  };
}

function collectUniqueFacilityLabels(entries: readonly PerSeriesRow[]): string[] {
  const labels: string[] = [];
  for (const entry of entries) {
    labels.push(...entry.facilityLabels);
  }
  return [...new Set(labels.filter(Boolean))];
}

function aggregateTeamFacilityPresentation(
  entries: readonly PerSeriesRow[],
): { label: string | null; extraCount: number } {
  const unique = collectUniqueFacilityLabels(entries);
  if (unique.length === 0) return { label: null, extraCount: 0 };
  if (unique.length === 1) return { label: unique[0]!, extraCount: 0 };
  return { label: unique[0]!, extraCount: unique.length - 1 };
}

function buildPerSeriesManagementRows(input: {
  series: readonly TrainingSeriesDto[];
  teamDisplayNameByTeamSeasonId: ReadonlyMap<string, string>;
  teamLabelByTeamSeasonId: ReadonlyMap<string, string>;
  allocationsBySeriesId: ReadonlyMap<string, readonly TrainingAllocationDto[]>;
}): PerSeriesRow[] {
  const rows: PerSeriesRow[] = [];

  for (const series of input.series) {
    const schedule = resolveSchedulePresentation(series);
    const allocations = input.allocationsBySeriesId.get(series.id) ?? [];
    const weekdays = resolveOrderedWeekdays(series);
    const facility = buildCompactFacilityPresentation(allocations);
    const teamLabel =
      input.teamLabelByTeamSeasonId.get(series.teamSeasonId) ??
      input.teamDisplayNameByTeamSeasonId.get(series.teamSeasonId) ??
      "—";

    rows.push({
      seriesId: series.id,
      teamSeasonId: series.teamSeasonId,
      title: series.title,
      teamDisplayName: teamLabel,
      weekdays,
      rhythmLabel: schedule.rhythmLabel,
      timeLabel: schedule.kind === "uniform" ? schedule.timeLabel : "Unterschiedliche Zeiten",
      timeLines: schedule.kind === "variable" ? schedule.timeLines : null,
      sortStartTime: resolveSortStartTime(series),
      facilityLabel: facility.label,
      facilityExtraCount: facility.extraCount,
      facilityLabels: facility.labels,
      status: series.status,
      planningStage: series.planningStage,
      validFrom: series.validFrom,
      validUntil: series.validUntil,
      sessionCount: series.sessionCount,
      updatedAt: series.updatedAt,
      actionLabel: resolveSeriesActionLabel(series),
    });
  }

  return rows;
}

export function groupPerSeriesRowsByTeam(input: {
  perSeriesRows: readonly PerSeriesRow[];
  tenantName: string;
  teamLabelByTeamSeasonId: ReadonlyMap<string, string>;
}): TrainingSeriesManagementRow[] {
  const grouped = new Map<string, PerSeriesRow[]>();

  for (const row of input.perSeriesRows) {
    const bucket = grouped.get(row.teamSeasonId) ?? [];
    bucket.push(row);
    grouped.set(row.teamSeasonId, bucket);
  }

  const teamRows: TrainingSeriesManagementRow[] = [];

  for (const [teamSeasonId, entries] of grouped) {
    const sortedEntries = [...entries].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    const teamLabel =
      input.teamLabelByTeamSeasonId.get(teamSeasonId) ?? sortedEntries[0]?.teamDisplayName ?? "—";
    const primaryTitle = resolveTeamManagementPrimaryTitle(
      teamLabel,
      sortedEntries.map((entry) => entry.title),
    );
    const weekdays = mergeOrderedWeekdays(sortedEntries.map((entry) => entry.weekdays));
    const rhythmLabel = weekdays.map((weekday) => WEEKDAY_SHORT[weekday]).join(" · ") || "—";
    const time = aggregateTeamTimePresentation(sortedEntries);
    const facility = aggregateTeamFacilityPresentation(sortedEntries);
    const seriesEntries: TrainingSeriesManagementSeriesEntry[] = sortedEntries.map((entry) => ({
      seriesId: entry.seriesId,
      title: entry.title,
      weekdays: entry.weekdays,
      timeLabel: entry.timeLabel,
      timeLines: entry.timeLines,
      actionLabel: entry.actionLabel,
      status: entry.status,
      updatedAt: entry.updatedAt,
    }));
    const status = deriveGroupedTeamStatus(seriesEntries);
    const sortStartTime = sortedEntries
      .map((entry) => entry.sortStartTime)
      .sort((a, b) => a.localeCompare(b))[0] ?? "99:99";
    const updatedAt = sortedEntries
      .map((entry) => entry.updatedAt)
      .sort((a, b) => b.localeCompare(a))[0] ?? "";
    const sessionCount = sortedEntries.reduce((sum, entry) => sum + entry.sessionCount, 0);
    const primarySeries = sortedEntries[0]!;

    teamRows.push({
      seriesId: primarySeries.seriesId,
      teamSeasonId,
      title: primaryTitle,
      contextLabel: resolveTeamManagementContextLabel(input.tenantName, teamLabel),
      teamDisplayName: teamLabel,
      weekdays,
      rhythmLabel,
      timeLabel: time.timeLabel,
      timeLines: time.timeLines,
      timeDetailLines: time.timeDetailLines,
      sortStartTime,
      facilityLabel: facility.label,
      facilityExtraCount: facility.extraCount,
      facilityLabels: collectUniqueFacilityLabels(sortedEntries),
      status,
      planningStage: primarySeries.planningStage,
      validFrom: primarySeries.validFrom,
      validUntil: primarySeries.validUntil,
      sessionCount,
      updatedAt,
      seriesEntries,
    });
  }

  return teamRows;
}

export function parseTrainingSeriesManagementSort(raw: string | undefined): TrainingSeriesManagementSort {
  const value = raw?.trim().toUpperCase();
  if (value === "TITLE" || value === "TITLE_ASC") return "TITLE_ASC";
  if (value === "TEAM" || value === "TEAM_ASC") return "TEAM_ASC";
  if (value === "WEEKDAY") return "WEEKDAY";
  if (value === "START_TIME") return "START_TIME";
  if (value === "UPDATED_DESC") return "UPDATED_DESC";
  return "TEAM_ASC";
}

export function sortTrainingSeriesManagementRows(
  rows: readonly TrainingSeriesManagementRow[],
  sort: TrainingSeriesManagementSort,
): TrainingSeriesManagementRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sort) {
      case "TITLE_ASC": {
        const titleDiff = a.title.localeCompare(b.title, "de-CH", { sensitivity: "base", numeric: true });
        return titleDiff !== 0 ? titleDiff : a.teamDisplayName.localeCompare(b.teamDisplayName, "de-CH", { numeric: true });
      }
      case "TEAM_ASC": {
        const teamDiff = a.teamDisplayName.localeCompare(b.teamDisplayName, "de-CH", {
          sensitivity: "base",
          numeric: true,
        });
        return teamDiff !== 0 ? teamDiff : a.title.localeCompare(b.title, "de-CH", { numeric: true });
      }
      case "WEEKDAY": {
        const aIndex = a.weekdays[0] ? COCKPIT_WEEKDAY_ORDER.indexOf(a.weekdays[0]) : 99;
        const bIndex = b.weekdays[0] ? COCKPIT_WEEKDAY_ORDER.indexOf(b.weekdays[0]) : 99;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.teamDisplayName.localeCompare(b.teamDisplayName, "de-CH", { numeric: true });
      }
      case "START_TIME": {
        const timeDiff = a.sortStartTime.localeCompare(b.sortStartTime);
        return timeDiff !== 0 ? timeDiff : a.teamDisplayName.localeCompare(b.teamDisplayName, "de-CH", { numeric: true });
      }
      case "UPDATED_DESC":
      default: {
        const updatedDiff = b.updatedAt.localeCompare(a.updatedAt);
        return updatedDiff !== 0 ? updatedDiff : a.teamDisplayName.localeCompare(b.teamDisplayName, "de-CH", { numeric: true });
      }
    }
  });
  return sorted;
}

export function paginateTrainingSeriesManagementRows(
  rows: readonly TrainingSeriesManagementRow[],
  page: number,
  pageSize: number = TRAINING_MANAGEMENT_SERIES_PAGE_SIZE,
): {
  rows: TrainingSeriesManagementRow[];
  totalCount: number;
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
} {
  const totalCount = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1), pageCount);
  const start = (safePage - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);

  return {
    rows: slice,
    totalCount,
    page: safePage,
    pageCount,
    rangeStart: totalCount === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, totalCount),
  };
}

export function buildTrainingSeriesManagementRows(input: {
  series: readonly TrainingSeriesDto[];
  tenantName: string;
  teamDisplayNameByTeamSeasonId: ReadonlyMap<string, string>;
  teamLabelByTeamSeasonId: ReadonlyMap<string, string>;
  allocationsBySeriesId: ReadonlyMap<string, readonly TrainingAllocationDto[]>;
}): TrainingSeriesManagementRow[] {
  const perSeriesRows = buildPerSeriesManagementRows(input);
  return groupPerSeriesRowsByTeam({
    perSeriesRows,
    tenantName: input.tenantName,
    teamLabelByTeamSeasonId: input.teamLabelByTeamSeasonId,
  });
}

export function filterTrainingSeriesManagementRows(
  rows: readonly TrainingSeriesManagementRow[],
  filters: TrainingSeriesManagementFilters,
): TrainingSeriesManagementRow[] {
  const search = normalizeSearch(filters.search);
  const teamSeasonId = filters.teamSeasonId?.trim() || null;
  const statusFilter = filters.status ?? "ACTIVE_ONLY";

  return rows.filter((row) => {
    if (teamSeasonId && row.teamSeasonId !== teamSeasonId) return false;

    if (statusFilter === "ACTIVE_ONLY") {
      if (row.status === "ARCHIVED") return false;
    } else if (statusFilter !== "ALL" && row.status !== statusFilter) {
      return false;
    }

    if (!search) return true;
    const seriesTitles = row.seriesEntries.map((entry) => entry.title).join(" ");
    const haystack =
      `${row.title} ${row.contextLabel} ${row.teamDisplayName} ${row.rhythmLabel} ${seriesTitles} ${row.facilityLabel ?? ""}`.toLowerCase();
    return haystack.includes(search);
  });
}

/** @deprecated weekday grouping label — kept for tests migrating from cockpit. */
export function weekdayLongLabel(weekday: Weekday): string {
  return COCKPIT_WEEKDAY_LABELS[weekday];
}
