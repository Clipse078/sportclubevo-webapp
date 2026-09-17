/**
 * SCE-TRAININGS-UX-01 — compact TrainingSeries management rows (Serien section).
 */

import {
  COCKPIT_WEEKDAY_LABELS,
  COCKPIT_WEEKDAY_ORDER,
  resolveSeriesAllocationDisplay,
  type TrainingSeriesCockpitRow,
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

export type TrainingSeriesManagementRow = {
  seriesId: string;
  teamSeasonId: string;
  title: string;
  teamDisplayName: string;
  rhythmLabel: string;
  timeLabel: string;
  facilityLabel: string | null;
  status: TrainingSeriesStatus;
  planningStage: string;
  validFrom: string | null;
  validUntil: string | null;
  sessionCount: number;
  /** Representative cockpit row for inline resource edits (first weekday). */
  primaryCockpitRowKey: string;
  cockpitRows: TrainingSeriesCockpitRow[];
};

export type TrainingSeriesManagementFilters = {
  search?: string;
  teamSeasonId?: string | null;
  status?: TrainingSeriesStatus | "ALL" | "ACTIVE_ONLY";
};

function normalizeSearch(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function buildTrainingSeriesManagementRows(input: {
  series: readonly TrainingSeriesDto[];
  teamDisplayNameByTeamSeasonId: ReadonlyMap<string, string>;
  allocationsBySeriesId: ReadonlyMap<string, readonly TrainingAllocationDto[]>;
  cockpitRows: readonly TrainingSeriesCockpitRow[];
}): TrainingSeriesManagementRow[] {
  const cockpitBySeries = new Map<string, TrainingSeriesCockpitRow[]>();
  for (const row of input.cockpitRows) {
    const bucket = cockpitBySeries.get(row.seriesId) ?? [];
    bucket.push(row);
    cockpitBySeries.set(row.seriesId, bucket);
  }

  const rows: TrainingSeriesManagementRow[] = [];

  for (const series of input.series) {
    const seriesCockpit = cockpitBySeries.get(series.id) ?? [];
    const weekdays = [...series.weekdaySchedules]
      .sort(
        (a, b) => COCKPIT_WEEKDAY_ORDER.indexOf(a.weekday) - COCKPIT_WEEKDAY_ORDER.indexOf(b.weekday),
      )
      .map((schedule) => schedule.weekday);

    const rhythmLabel = weekdays.map((day) => WEEKDAY_SHORT[day]).join(" · ");

    const timeKeys = new Set(series.weekdaySchedules.map((s) => `${s.startsAt}–${s.endsAt}`));
    const timeLabel =
      timeKeys.size === 1
        ? `${series.weekdaySchedules[0]?.startsAt ?? series.startsAt}–${series.weekdaySchedules[0]?.endsAt ?? series.endsAt}`
        : "Variabel";

    const allocationDisplay = resolveSeriesAllocationDisplay(
      input.allocationsBySeriesId.get(series.id) ?? [],
    );

    rows.push({
      seriesId: series.id,
      teamSeasonId: series.teamSeasonId,
      title: series.title,
      teamDisplayName:
        input.teamDisplayNameByTeamSeasonId.get(series.teamSeasonId) ??
        seriesCockpit[0]?.teamDisplayName ??
        "—",
      rhythmLabel: rhythmLabel || "—",
      timeLabel,
      facilityLabel: allocationDisplay.pitchName,
      status: series.status,
      planningStage: series.planningStage,
      validFrom: series.validFrom,
      validUntil: series.validUntil,
      sessionCount: series.sessionCount,
      primaryCockpitRowKey: seriesCockpit[0]?.rowKey ?? series.id,
      cockpitRows: seriesCockpit,
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
