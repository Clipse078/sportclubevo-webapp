/**
 * TRAININGS-UX-03 — presentation helpers for the Training Session Record Workspace.
 * Pure formatting (no I/O).
 */

import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import type { TrainingSessionAllocationDto, TrainingSessionDto, Weekday } from "@/lib/training/types";

const WEEKDAY_LONG: Record<Weekday, string> = {
  MONDAY: "Montag",
  TUESDAY: "Dienstag",
  WEDNESDAY: "Mittwoch",
  THURSDAY: "Donnerstag",
  FRIDAY: "Freitag",
  SATURDAY: "Samstag",
  SUNDAY: "Sonntag",
};

export function trainingSessionWeekdayLong(weekday: Weekday): string {
  return WEEKDAY_LONG[weekday];
}

export function formatTrainingSessionOccurrenceHeadline(
  date: string,
  locale: string,
  timezone: string,
): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(parsed);
}

export function formatTrainingSessionBreadcrumbDate(
  date: string,
  locale: string,
  timezone: string,
): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(parsed);
}

export function formatTrainingSessionTimeRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

export function formatTrainingSessionScheduleLine(input: {
  date: string;
  startTime: string;
  endTime: string;
  locale: string;
  timezone: string;
}): string {
  return `${formatTrainingSessionOccurrenceHeadline(input.date, input.locale, input.timezone)} · ${formatTrainingSessionTimeRange(input.startTime, input.endTime)}`;
}

export function formatTrainingSessionSeriesBaselineLine(input: {
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  weekday: Weekday;
}): string {
  return `${trainingSessionWeekdayLong(input.weekday)} · ${formatTrainingSessionTimeRange(input.originalStartTime, input.originalEndTime)}`;
}

export function trainingSessionHasAllocationOverrides(
  sessionAllocations: readonly TrainingSessionAllocationDto[],
): boolean {
  return sessionAllocations.length > 0;
}

export function trainingSessionMatchesSeriesStandard(input: {
  session: Pick<TrainingSessionDto, "isRescheduled" | "dressingRoomOccupancyMode">;
  sessionAllocations: readonly TrainingSessionAllocationDto[];
}): boolean {
  if (input.session.isRescheduled) return false;
  if (input.session.dressingRoomOccupancyMode === "CUSTOM") return false;
  return !trainingSessionHasAllocationOverrides(input.sessionAllocations);
}

export function trainingSessionOverrideStatusLabel(matchesSeriesStandard: boolean): string {
  return matchesSeriesStandard ? "Serienstandard" : "Abweichend von Serie";
}

type AllocationPitchLike = {
  facilityResourceType: string;
  facilityResourceName: string;
  facilityName: string;
};

export function resolveTrainingSessionPitchPresentation(
  sessionAllocations: readonly TrainingSessionAllocationDto[],
  seriesAllocations: readonly AllocationPitchLike[],
): { primaryName: string | null; secondaryLine: string | null; isOverridden: boolean } {
  const overridePitch = sessionAllocations.find(
    (row) => classifyFacilityResourceType(row.facilityResourceType) === "PITCH_HALL",
  );
  const seriesPitch = seriesAllocations.find(
    (row) => classifyFacilityResourceType(row.facilityResourceType) === "PITCH_HALL",
  );
  const row = overridePitch ?? seriesPitch;
  if (!row) return { primaryName: null, secondaryLine: null, isOverridden: Boolean(overridePitch) };

  const typeLabel =
    row.facilityResourceType === "HALF_PITCH"
      ? "Halbes Feld"
      : row.facilityResourceType === "FULL_PITCH"
        ? "Ganzes Feld"
        : null;

  return {
    primaryName: row.facilityResourceName,
    secondaryLine: typeLabel ? `${row.facilityName} · ${typeLabel}` : row.facilityName,
    isOverridden: Boolean(overridePitch),
  };
}

export function resolveTrainingSessionDressingRoomCodes(
  sessionAllocations: readonly TrainingSessionAllocationDto[],
  seriesAllocations: readonly { facilityResourceType: string; facilityResourceCode: string }[],
): { codes: string[]; isOverridden: boolean } {
  const overrideRows = sessionAllocations.filter(
    (row) => classifyFacilityResourceType(row.facilityResourceType) === "DRESSING_ROOM",
  );
  const seriesRows = seriesAllocations.filter(
    (row) => classifyFacilityResourceType(row.facilityResourceType) === "DRESSING_ROOM",
  );
  const rows = overrideRows.length > 0 ? overrideRows : seriesRows;
  return {
    codes: rows.map((row) => row.facilityResourceCode),
    isOverridden: overrideRows.length > 0,
  };
}
