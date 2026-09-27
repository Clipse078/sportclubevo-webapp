/** Viewport breakpoints for personal calendar responsive tiers (UX-04). */

export const PERSONAL_CALENDAR_MOBILE_MAX_WIDTH_PX = 639;
export const PERSONAL_CALENDAR_TABLET_MAX_WIDTH_PX = 1023;

/** SSR / hydration-first paint assumes large desktop (matches day-capacity server snapshot). */
export const PERSONAL_CALENDAR_LAYOUT_SERVER_VIEWPORT_PX = 1280;

export type PersonalCalendarLayoutMode = "mobile-compact" | "tablet-grid" | "desktop-grid";

export function resolvePersonalCalendarLayoutMode(viewportWidthPx: number): PersonalCalendarLayoutMode {
  if (viewportWidthPx <= PERSONAL_CALENDAR_MOBILE_MAX_WIDTH_PX) {
    return "mobile-compact";
  }
  if (viewportWidthPx <= PERSONAL_CALENDAR_TABLET_MAX_WIDTH_PX) {
    return "tablet-grid";
  }
  return "desktop-grid";
}

export function isPersonalCalendarMobileCompactMode(mode: PersonalCalendarLayoutMode): boolean {
  return mode === "mobile-compact";
}
