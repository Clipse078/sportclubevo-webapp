import { cn } from "@/lib/cn";

/** Canonical translucent glass surface for personal dashboard cockpit cards (SCE-VISUAL-05). */
export const dashboardCockpitSurfaceClassName = cn(
  "overflow-hidden rounded-[var(--radius-xl)]",
  "border border-[color-mix(in_srgb,rgba(148,163,184,0.38)_45%,var(--border))]",
  "bg-[color-mix(in_srgb,rgba(15,23,42,0.78)_92%,transparent)]",
  "shadow-[0_10px_40px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]",
  "backdrop-blur-[14px] supports-[backdrop-filter]:bg-[color-mix(in_srgb,rgba(15,23,42,0.65)_88%,transparent)]",
  "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200",
  "motion-safe:hover:border-[color-mix(in_srgb,rgba(148,163,184,0.55)_55%,var(--border))]",
  "motion-safe:hover:shadow-[0_12px_44px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.08)]",
);

/** Row sizing is owned by {@link DashboardCockpitGrid}; cards stretch within grid tracks. */
export const DASHBOARD_COCKPIT_CARD_MIN_HEIGHT = "min-h-0";
