import { cn } from "@/lib/cn";

/**
 * Canonical cockpit card surface (SCE-VISUAL-05).
 * Dark default: glass + backdrop-blur via `.sce-dashboard-cockpit-card` in globals.css.
 * White edition: pure white panel — see SCE-DS2-05B theme overrides.
 */
export const dashboardCockpitSurfaceClassName = cn(
  "sce-dashboard-cockpit-card",
  "overflow-hidden rounded-[var(--radius-xl)]",
  "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200",
);

/** Row sizing is owned by {@link DashboardCockpitGrid}; cards stretch within grid tracks. */
export const DASHBOARD_COCKPIT_CARD_MIN_HEIGHT = "min-h-0";
