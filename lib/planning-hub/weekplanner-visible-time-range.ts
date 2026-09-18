/**
 * PLANNING-UX-03B — user-visible Kalender time window (presentation only).
 * Persisted via localStorage (same family as lib/shell/sidebar-width.ts).
 */

import type { VisibleTimeRange } from "./scheduler/time-scale";

export const WEEKPLANNER_VISIBLE_TIME_RANGE_STORAGE_KEY =
  "sce-weekplanner-visible-time-range";

export const WEEKPLANNER_TIME_GRID_MINUTES = 30;

export const WEEKPLANNER_DEFAULT_VISIBLE_START_MINUTES = 8 * 60;
export const WEEKPLANNER_DEFAULT_VISIBLE_END_MINUTES = 23 * 60;

export type WeekplannerVisibleTimeRangePreference = {
  startMinutes: number;
  endMinutes: number;
};

export function defaultWeekplannerVisibleTimeRange(): WeekplannerVisibleTimeRangePreference {
  return {
    startMinutes: WEEKPLANNER_DEFAULT_VISIBLE_START_MINUTES,
    endMinutes: WEEKPLANNER_DEFAULT_VISIBLE_END_MINUTES,
  };
}

export function minutesToTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseTimeLabelToMinutes(label: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 24 || minute < 0 || minute >= 60) return null;
  if (hour === 24 && minute !== 0) return null;
  return hour * 60 + minute;
}

export function snapMinutesToGrid(minutes: number): number {
  return Math.round(minutes / WEEKPLANNER_TIME_GRID_MINUTES) * WEEKPLANNER_TIME_GRID_MINUTES;
}

export function validateWeekplannerVisibleTimeRange(
  startMinutes: number,
  endMinutes: number,
): string | null {
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return "Ungültige Zeitangabe.";
  }
  if (startMinutes % WEEKPLANNER_TIME_GRID_MINUTES !== 0) {
    return "Startzeit muss in 30-Minuten-Schritten gewählt werden.";
  }
  if (endMinutes % WEEKPLANNER_TIME_GRID_MINUTES !== 0) {
    return "Endzeit muss in 30-Minuten-Schritten gewählt werden.";
  }
  if (startMinutes < 0 || endMinutes > 24 * 60) {
    return "Zeitraum muss zwischen 00:00 und 24:00 liegen.";
  }
  if (endMinutes <= startMinutes) {
    return "Endzeit muss nach der Startzeit liegen.";
  }
  if (endMinutes - startMinutes < WEEKPLANNER_TIME_GRID_MINUTES) {
    return "Der sichtbare Zeitraum ist zu kurz.";
  }
  return null;
}

export function normalizeWeekplannerVisibleTimeRange(
  raw: WeekplannerVisibleTimeRangePreference | null | undefined,
): WeekplannerVisibleTimeRangePreference {
  const fallback = defaultWeekplannerVisibleTimeRange();
  if (!raw) return fallback;
  const startMinutes = snapMinutesToGrid(raw.startMinutes);
  const endMinutes = snapMinutesToGrid(raw.endMinutes);
  const error = validateWeekplannerVisibleTimeRange(startMinutes, endMinutes);
  if (error) return fallback;
  return { startMinutes, endMinutes };
}

export function toVisibleTimeRange(
  pref: WeekplannerVisibleTimeRangePreference,
): VisibleTimeRange {
  return {
    startMinutes: pref.startMinutes,
    endMinutes: pref.endMinutes,
    totalMinutes: pref.endMinutes - pref.startMinutes,
  };
}

export function listWeekplannerTimeOptions(): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  for (let m = 0; m <= 24 * 60; m += WEEKPLANNER_TIME_GRID_MINUTES) {
    options.push({ value: m, label: minutesToTimeLabel(m) });
  }
  return options;
}

export function readStoredWeekplannerVisibleTimeRange(): WeekplannerVisibleTimeRangePreference {
  if (typeof window === "undefined") {
    return defaultWeekplannerVisibleTimeRange();
  }
  try {
    const raw = localStorage.getItem(WEEKPLANNER_VISIBLE_TIME_RANGE_STORAGE_KEY);
    if (!raw) return defaultWeekplannerVisibleTimeRange();
    const parsed = JSON.parse(raw) as WeekplannerVisibleTimeRangePreference;
    return normalizeWeekplannerVisibleTimeRange(parsed);
  } catch {
    return defaultWeekplannerVisibleTimeRange();
  }
}

export function persistWeekplannerVisibleTimeRange(
  pref: WeekplannerVisibleTimeRangePreference,
): WeekplannerVisibleTimeRangePreference {
  const normalized = normalizeWeekplannerVisibleTimeRange(pref);
  if (typeof window !== "undefined") {
    localStorage.setItem(
      WEEKPLANNER_VISIBLE_TIME_RANGE_STORAGE_KEY,
      JSON.stringify(normalized),
    );
  }
  return normalized;
}
