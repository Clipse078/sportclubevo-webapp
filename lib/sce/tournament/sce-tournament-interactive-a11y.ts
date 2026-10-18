import { cn } from "@/lib/cn";

/** Visible keyboard focus for Tournament Planner interactive controls (WCAG 2.2 AA). */
export const SCE_TOURNAMENT_FOCUS_RING_CLASS = cn(
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
);

/** Touch-friendly text actions (print, PDF, external links) without bespoke button chrome. */
export const SCE_TOURNAMENT_ACTION_LINK_CLASS = cn(
  "inline-flex min-h-11 items-center rounded-lg border border-[var(--border)]",
  "bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--foreground)]",
  "hover:bg-[var(--surface)]",
  SCE_TOURNAMENT_FOCUS_RING_CLASS,
);

/** Native selects in Spielplan / Planung surfaces. */
export const SCE_TOURNAMENT_SELECT_CLASS = cn(
  "min-h-11 rounded-lg border border-[var(--sce-surface-border)]",
  "bg-[var(--sce-surface-elevated)] px-3 py-2 text-sm",
  SCE_TOURNAMENT_FOCUS_RING_CLASS,
);

/** Compact fixture / timeline controls (Planung board + mobile). */
export const SCE_TOURNAMENT_FIXTURE_CONTROL_CLASS = cn(
  SCE_TOURNAMENT_FOCUS_RING_CLASS,
);

/** Visually hidden live region for concise user-facing schedule updates. */
export const SCE_TOURNAMENT_SR_LIVE_REGION_CLASS = "sr-only";
