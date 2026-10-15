import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";
import type { ProgrammeCalendarMicroEntry } from "@/lib/programme-engine/programme-calendar-presentation";

export type MonthActivityGridDay = {
  /** Tenant-local yyyy-MM-dd */
  dayKey: string;
  dayNumber: string;
  inMonth: boolean;
  isToday: boolean;
  activityCount: number;
  isSelected: boolean;
  /** Pre-built accessible name (required for selectable cells). */
  accessibleLabel: string;
  /** Compact in-cell preview (authorized programme only). */
  activityPreviewLabel?: string;
  primarySourceType?: PersonalProgrammeSourceType;
  /** Semantic marker slots (personal calendar, max 3; may repeat types). */
  activityMarkerSourceTypes?: readonly PersonalProgrammeSourceType[];
  /** +N overflow beyond visible marker slots (authorized count preserved in aria). */
  activityMarkerOverflow?: number;
  /** Optional tooltip / supplemental label for marker row. */
  activityMarkerTooltip?: string;
  /** Canonical SCE Calendar Engine — compact in-cell activity tiles. */
  sceCalendarEntries?: readonly ProgrammeCalendarMicroEntry[];
  /** @deprecated Prefer sceCalendarEntries — alias retained for Programme consumers. */
  programmeCalendarEntries?: readonly ProgrammeCalendarMicroEntry[];
  /** +N beyond visible micro entries. */
  sceCalendarOverflow?: number;
  /** @deprecated Prefer sceCalendarOverflow. */
  programmeCalendarOverflow?: number;
};

export type MonthActivityGridNavigation = {
  previousMonthHref?: string;
  nextMonthHref?: string;
  todayHref?: string;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onToday?: () => void;
};
