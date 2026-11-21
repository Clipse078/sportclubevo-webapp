/**
 * Vereinsentwicklung visual primitives — aligned with ClubDevelopmentOverview (Übersicht).
 * Prefer these tokens over ad-hoc card chrome in club-development surfaces.
 */

export const SCE_CD_SECTION_SHELL_CLASS =
  "rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)] overflow-hidden";

export const SCE_CD_SECTION_HEADER_CLASS =
  "flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3.5";

export const SCE_CD_SECTION_BODY_CLASS = "p-5 space-y-3";

export const SCE_CD_EMPTY_STATE_CLASS =
  "rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--muted)]";

export const SCE_CD_RECORD_ROW_CLASS =
  "block rounded-lg border border-[var(--border)] px-4 py-3 transition hover:bg-[var(--surface-2)]";

export const SCE_CD_WORKSPACE_PANEL_CLASS =
  "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]";

/** Shared Vereinsentwicklung backlog table grids (desktop). */
export const SCE_CD_BACKLOG_GRID_STRATEGY =
  "sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.72fr)_minmax(0,1.05fr)_minmax(0,1.05fr)_auto] sm:items-center";

export const SCE_CD_BACKLOG_GRID_ZIEL =
  "sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.8fr)_minmax(0,5.75rem)_minmax(0,1.1fr)_minmax(0,0.85fr)_auto] sm:items-center";

export const SCE_CD_BACKLOG_GRID_TASK =
  "sm:grid-cols-[auto_minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,5.75rem)_minmax(0,0.95fr)_auto] sm:items-center";

export const SCE_CD_BACKLOG_GRID_TASK_PROGRESS =
  "sm:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,5.5rem)_minmax(0,0.9fr)_minmax(0,1.05fr)_auto] sm:items-center";

export const SCE_CD_BACKLOG_ROW_CLASS =
  "grid gap-x-3 gap-y-1 py-2.5 px-0.5 sm:gap-3 sm:py-2";