/**
 * TRAININGS-UX-01I — compact header metadata for the series edit workspace.
 * Pure presentation helpers (no I/O).
 */

import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import { COCKPIT_WEEKDAY_ORDER, resolveSeriesAllocationDisplay } from "@/lib/training/series-cockpit";
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

export function trainingSeriesStatusLabel(status: TrainingSeriesStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Aktiv";
    case "INACTIVE":
      return "Inaktiv";
    case "ARCHIVED":
      return "Archiviert";
    default:
      return status;
  }
}

export function formatTrainingSeriesScheduleRail(series: Pick<TrainingSeriesDto, "weekdaySchedules">): string | null {
  const schedules = [...series.weekdaySchedules].sort(
    (a, b) => COCKPIT_WEEKDAY_ORDER.indexOf(a.weekday) - COCKPIT_WEEKDAY_ORDER.indexOf(b.weekday),
  );
  if (schedules.length === 0) return null;

  const timeKeys = new Set(schedules.map((s) => `${s.startsAt}–${s.endsAt}`));
  if (timeKeys.size === 1) {
    const days = schedules.map((s) => WEEKDAY_SHORT[s.weekday]).join(" · ");
    const { startsAt, endsAt } = schedules[0]!;
    return `${days} · ${startsAt}–${endsAt}`;
  }

  return schedules.map((s) => `${WEEKDAY_SHORT[s.weekday]} ${s.startsAt}–${s.endsAt}`).join(" · ");
}

export function formatTrainingSeriesEditHeaderMeta(input: {
  series: Pick<TrainingSeriesDto, "weekdaySchedules" | "status">;
  allocations: readonly TrainingAllocationDto[];
}): {
  statusLabel: string;
  scheduleRail: string | null;
  pitchLabel: string | null;
  dressingRoomLabel: string | null;
  pitchTypeLabel: string | null;
} {
  const allocationDisplay = resolveSeriesAllocationDisplay(input.allocations);
  const pitch = input.allocations.find(
    (a) => classifyFacilityResourceType(a.facilityResourceType) === "PITCH_HALL",
  );

  return {
    statusLabel: trainingSeriesStatusLabel(input.series.status),
    scheduleRail: formatTrainingSeriesScheduleRail(input.series),
    pitchLabel: allocationDisplay.pitchName,
    dressingRoomLabel: allocationDisplay.dressingRoomName,
    pitchTypeLabel: pitch ? resourceTypeLabel(pitch.facilityResourceType) : null,
  };
}

function resourceTypeLabel(type: string): string | null {
  switch (type) {
    case "FULL_PITCH":
      return "Ganzes Feld";
    case "HALF_PITCH":
      return "Halbes Feld";
    case "DRESSING_ROOM":
      return "Garderobe";
    default:
      return null;
  }
}
