import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";
import type { ProgrammeCalendarMicroEntry } from "@/lib/programme-engine/programme-calendar-presentation";

/**
 * Canonical month-grid calendar tile contract (presentation-only).
 * Semantic ownership: typeLabel, timeLabel, identityLabel, locationLabel, status (cancelled flag).
 * Domain models adapt into this shape via scope-specific builders — one fact per slot, no duplication.
 */
export type SceCalendarMicroEntry = ProgrammeCalendarMicroEntry;

export type SceCalendarMonthDay = {
  /** Tenant-local yyyy-MM-dd */
  dayKey: string;
  dayNumber: string;
  inMonth: boolean;
  isToday: boolean;
  activityCount: number;
  isSelected: boolean;
  accessibleLabel: string;
  primarySourceType?: PersonalProgrammeSourceType;
  activityMarkerSourceTypes?: readonly PersonalProgrammeSourceType[];
  activityMarkerOverflow?: number;
  activityMarkerTooltip?: string;
  /** Canonical in-cell micro tiles (Programme, Personal Kalender, …). */
  sceCalendarEntries?: readonly SceCalendarMicroEntry[];
  sceCalendarOverflow?: number;
};

export type SceCalendarLegendEntry = {
  sourceType: PersonalProgrammeSourceType | "TASK";
  label: string;
};
