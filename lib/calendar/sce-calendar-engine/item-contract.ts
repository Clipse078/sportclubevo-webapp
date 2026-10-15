import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";
import type { ProgrammeCalendarMicroEntry } from "@/lib/programme-engine/programme-calendar-presentation";

/**
 * Canonical month-grid calendar tile contract (presentation-only).
 * Domain models (Training, Match, Task, …) adapt into this shape via scope-specific builders.
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
