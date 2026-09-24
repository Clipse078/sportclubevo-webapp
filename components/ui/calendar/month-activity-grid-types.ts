import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";

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
  /** Distinct programme source markers (personal calendar, max 3). */
  activityMarkerSourceTypes?: readonly PersonalProgrammeSourceType[];
  /** +N overflow beyond visible marker slots (authorized count preserved in aria). */
  activityMarkerOverflow?: number;
};

export type MonthActivityGridNavigation = {
  previousMonthHref?: string;
  nextMonthHref?: string;
  todayHref?: string;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onToday?: () => void;
};
