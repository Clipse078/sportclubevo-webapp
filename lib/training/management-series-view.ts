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

export type TrainingSeriesManagementRow = {
  seriesId: string;
  teamSeasonId: string;
  title: string;
  teamDisplayName: string;
  rhythmLabel: string;
  timeLabel: string;
  timeLines: string[] | null;
  facilityLabel: string | null;
  status: TrainingSeriesStatus;
  planningStage: string;
  validFrom: string | null;
  validUntil: string | null;
  sessionCount: number;
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

function buildCompactFacilityLabel(allocations: readonly TrainingAllocationDto[]): string | null {
  const pitches = allocations.filter(
    (allocation) => classifyFacilityResourceType(allocation.facilityResourceType) === "PITCH_HALL",
  );
  if (pitches.length === 0) {
    const display = resolveSeriesAllocationDisplay(allocations);
    return display.pitchName;
  }

  const codes = pitches
    .map((allocation) => allocation.facilityResourceCode?.trim() || allocation.facilityResourceName.trim())
    .filter((value) => value.length > 0);

  const unique = [...new Set(codes)];
  return unique.length > 0 ? unique.join(" · ") : null;
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

    rows.push({
      seriesId: series.id,
      teamSeasonId: series.teamSeasonId,
      title: series.title,
      teamDisplayName: input.teamDisplayNameByTeamSeasonId.get(series.teamSeasonId) ?? "—",
      rhythmLabel: schedule.rhythmLabel,
      timeLabel: schedule.kind === "uniform" ? schedule.timeLabel : "Variabel",
      timeLines: schedule.kind === "variable" ? schedule.timeLines : null,
      facilityLabel: buildCompactFacilityLabel(allocations),
      status: series.status,
      planningStage: series.planningStage,
      validFrom: series.validFrom,
      validUntil: series.validUntil,
      sessionCount: series.sessionCount,
    });
  }

  return rows.sort((a, b) => {
    const teamDiff = a.teamDisplayName.localeCompare(b.teamDisplayName, "de-CH");
    if (teamDiff !== 0) return teamDiff;
    return a.title.localeCompare(b.title, "de-CH");
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
    const haystack = `${row.title} ${row.teamDisplayName} ${row.rhythmLabel} ${row.facilityLabel ?? ""}`.toLowerCase();
    return haystack.includes(search);
  });
}

/** @deprecated weekday grouping label — kept for tests migrating from cockpit. */
export function weekdayLongLabel(weekday: Weekday): string {
  return COCKPIT_WEEKDAY_LABELS[weekday];
}
