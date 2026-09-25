/**
 * SCE-VISUAL-02 — canonical authenticated surface hierarchy tokens.
 * CSS variables are defined in app/globals.css; components consume var(--sce-surface-*).
 */

export const SCE_SURFACE_TOKEN_SUBTLE = "--sce-surface-subtle";
export const SCE_SURFACE_TOKEN_STANDARD = "--sce-surface-standard";
export const SCE_SURFACE_TOKEN_DENSE = "--sce-surface-dense";
export const SCE_SURFACE_TOKEN_ELEVATED = "--sce-surface-elevated";

export const SCE_SURFACE_BORDER_TOKEN_SUBTLE = "--sce-surface-border-subtle";
export const SCE_SURFACE_BORDER_TOKEN = "--sce-surface-border";
export const SCE_SURFACE_BORDER_TOKEN_ELEVATED = "--sce-surface-border-elevated";

export const SCE_SURFACE_CLASS_SUBTLE = "sce-surface-subtle";
export const SCE_SURFACE_CLASS_STANDARD = "sce-surface-standard";
export const SCE_SURFACE_CLASS_DENSE = "sce-surface-dense";
export const SCE_SURFACE_CLASS_ELEVATED = "sce-surface-elevated";

/** Tailwind utility fragments for operational planner/resource matrices. */
export const SCE_SURFACE_DENSE_PANEL =
  "rounded-md border border-[var(--sce-surface-border)] bg-[var(--sce-surface-dense)]";

export const SCE_SURFACE_STANDARD_PANEL =
  "rounded-xl border border-[var(--sce-surface-border)] bg-[var(--sce-surface-standard)] shadow-[var(--sce-surface-shadow)]";

export const SCE_KPI_CARD_SURFACE =
  "border-[var(--sce-surface-border)] bg-[var(--sce-surface-standard)] shadow-[var(--sce-surface-shadow)]";

/** Files that must use the dense operational token inside planner grids. */
export const SCE_PLANNER_DENSE_SURFACE_SOURCES = [
  "components/admin/planning-hub/PlanningHubCalendarView.tsx",
  "components/admin/planning-hub/PlanningHubResourceDayView.tsx",
  "components/admin/planning-hub/PlanningHubAllDayLane.tsx",
] as const;
