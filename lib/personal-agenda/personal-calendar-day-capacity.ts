/**
 * Month grid visible event-block capacity (UX-03R1).
 * Uses week-row geometry instead of a universal fixed cap.
 */

export const PERSONAL_CALENDAR_DAY_VISIBLE_BLOCK_LIMIT_LEGACY = 3;

/** Large-desktop baseline when week geometry is unknown (tests, fallbacks). */
export const PERSONAL_CALENDAR_DAY_VISIBLE_BLOCK_LIMIT = 5;

export function resolvePersonalCalendarDayVisibleBlockLimit(weekRowCount: number): number {
  if (weekRowCount >= 6) return 4;
  if (weekRowCount <= 5) return 5;
  return 4;
}

export function resolvePersonalCalendarDayVisibleBlockLimitForViewport(
  weekRowCount: number,
  viewportWidthPx: number,
): number {
  const desktop = resolvePersonalCalendarDayVisibleBlockLimit(weekRowCount);
  if (viewportWidthPx < 640) return Math.min(2, desktop);
  if (viewportWidthPx < 1024) return Math.min(3, desktop);
  return desktop;
}
