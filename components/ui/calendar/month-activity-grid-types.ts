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
  /** Semantic marker slots (personal calendar, max 3; may repeat types). */
  activityMarkerSourceTypes?: readonly PersonalProgrammeSourceType[];
  /** +N overflow beyond visible marker slots (authorized count preserved in aria). */
  activityMarkerOverflow?: number;
  /** Optional tooltip / supplemental label for marker row. */
  activityMarkerTooltip?: string;
};

export type MonthActivityGridNavigation = {
  previousMonthHref?: string;
  nextMonthHref?: string;
  todayHref?: string;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onToday?: () => void;
};
