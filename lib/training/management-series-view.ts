/**
 * SCE-TRAININGS-UX-01 — compact TrainingSeries management rows (Serien section).
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

export type TrainingSeriesManagementRow = {
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
  status: TrainingSeriesStatus;
  planningStage: string;
  validFrom: string | null;
  validUntil: string | null;
  sessionCount: number;
  updatedAt: string;
};

export type TrainingSeriesManagementFilters = {
  search?: string;
  teamSeasonId?: string | null;
  status?: TrainingSeriesStatus | "ALL" | "ACTIVE_ONLY";
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
    return { label: display.pitchName, extraCount: 0 };
  }

  if (unique.length === 1) {
    return { label: unique[0]!, extraCount: 0 };
  }

  return { label: unique[0]!, extraCount: unique.length - 1 };
}

export function parseTrainingSeriesManagementSort(raw: string | undefined): TrainingSeriesManagementSort {
  const value = raw?.trim().toUpperCase();
  if (value === "TITLE" || value === "TITLE_ASC") return "TITLE_ASC";
  if (value === "TEAM" || value === "TEAM_ASC") return "TEAM_ASC";
  if (value === "WEEKDAY") return "WEEKDAY";
  if (value === "START_TIME") return "START_TIME";
  return "UPDATED_DESC";
}

export function sortTrainingSeriesManagementRows(
  rows: readonly TrainingSeriesManagementRow[],
  sort: TrainingSeriesManagementSort,
): TrainingSeriesManagementRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sort) {
      case "TITLE_ASC": {
        const titleDiff = a.title.localeCompare(b.title, "de-CH");
        return titleDiff !== 0 ? titleDiff : a.teamDisplayName.localeCompare(b.teamDisplayName, "de-CH");
      }
      case "TEAM_ASC": {
        const teamDiff = a.teamDisplayName.localeCompare(b.teamDisplayName, "de-CH");
        return teamDiff !== 0 ? teamDiff : a.title.localeCompare(b.title, "de-CH");
      }
      case "WEEKDAY": {
        const aIndex = a.weekdays[0] ? COCKPIT_WEEKDAY_ORDER.indexOf(a.weekdays[0]) : 99;
        const bIndex = b.weekdays[0] ? COCKPIT_WEEKDAY_ORDER.indexOf(b.weekdays[0]) : 99;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.title.localeCompare(b.title, "de-CH");
      }
      case "START_TIME": {
        const timeDiff = a.sortStartTime.localeCompare(b.sortStartTime);
        return timeDiff !== 0 ? timeDiff : a.title.localeCompare(b.title, "de-CH");
      }
      case "UPDATED_DESC":
      default: {
        const updatedDiff = b.updatedAt.localeCompare(a.updatedAt);
        return updatedDiff !== 0 ? updatedDiff : a.title.localeCompare(b.title, "de-CH");
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
  teamDisplayNameByTeamSeasonId: ReadonlyMap<string, string>;
  allocationsBySeriesId: ReadonlyMap<string, readonly TrainingAllocationDto[]>;
}): TrainingSeriesManagementRow[] {
  const rows: TrainingSeriesManagementRow[] = [];

  for (const series of input.series) {
    const schedule = resolveSchedulePresentation(series);
    const allocations = input.allocationsBySeriesId.get(series.id) ?? [];
    const weekdays = resolveOrderedWeekdays(series);
    const facility = buildCompactFacilityPresentation(allocations);

    rows.push({
      seriesId: series.id,
      teamSeasonId: series.teamSeasonId,
      title: series.title,
      teamDisplayName: input.teamDisplayNameByTeamSeasonId.get(series.teamSeasonId) ?? "—",
      weekdays,
      rhythmLabel: schedule.rhythmLabel,
      timeLabel: schedule.kind === "uniform" ? schedule.timeLabel : "Unterschiedliche Zeiten",
      timeLines: schedule.kind === "variable" ? schedule.timeLines : null,
      sortStartTime: resolveSortStartTime(series),
      facilityLabel: facility.label,
      facilityExtraCount: facility.extraCount,
      status: series.status,
      planningStage: series.planningStage,
      validFrom: series.validFrom,
      validUntil: series.validUntil,
      sessionCount: series.sessionCount,
      updatedAt: series.updatedAt,
    });
  }

  return rows;
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
    const haystack = `${row.title} ${row.teamDisplayName} ${row.rhythmLabel} ${row.facilityLabel ?? ""}`.toLowerCase();
    return haystack.includes(search);
  });
}

/** @deprecated weekday grouping label — kept for tests migrating from cockpit. */
export function weekdayLongLabel(weekday: Weekday): string {
  return COCKPIT_WEEKDAY_LABELS[weekday];
}
