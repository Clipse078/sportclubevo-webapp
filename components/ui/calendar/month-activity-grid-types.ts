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
};

export type MonthActivityGridNavigation = {
  previousMonthHref?: string;
  nextMonthHref?: string;
  todayHref?: string;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onToday?: () => void;
};
