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
};

export type MonthActivityGridNavigation = {
  previousMonthHref?: string;
  nextMonthHref?: string;
  todayHref?: string;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onToday?: () => void;
};
