/**
 * Vereinsentwicklung visual primitives — aligned with ClubDevelopmentOverview (Übersicht).
 * Prefer these tokens over ad-hoc card chrome in club-development surfaces.
 */

export const SCE_CD_SECTION_SHELL_CLASS =
  "rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)] overflow-hidden";

export const SCE_CD_SECTION_HEADER_CLASS =
  "flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3.5";

export const SCE_CD_SECTION_BODY_CLASS = "p-5 space-y-3";

/** Übersicht Zielboard — flush rows, no nested panel padding. */
export const SCE_CD_SECTION_BODY_COMPACT_CLASS = "px-4 py-2";

export const SCE_CD_OVERVIEW_SECTION_STACK_CLASS = "space-y-3";

export const SCE_CD_EMPTY_STATE_CLASS =
  "rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--muted)]";

export const SCE_CD_RECORD_ROW_CLASS =
  "block rounded-lg border border-[var(--border)] px-4 py-3 transition hover:bg-[var(--surface-2)]";

export const SCE_CD_WORKSPACE_PANEL_CLASS =
  "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]";

/** PO Zielboard — copper thin progress bar accent. */
export const SCE_CD_BACKLOG_PROGRESS_ACCENT = "bg-[#d4843a]";

/**
 * Shared Übersicht column tracks (Strategien, Ziele, Aufgaben).
 * Referenz · Titel · Kontext · Status · Fortschritt · Verantwortlich · Aktionen
 *
 * Fixed leading/trailing tracks so each section grid resolves identical geometry;
 * progress width does not grow with caption (overflow is handled in-cell).
 */
export const SCE_CD_OVERVIEW_UNIFIED_GRID =
  "sm:grid-cols-[8.5rem_minmax(0,1.15fr)_minmax(0,0.88fr)_5.75rem_12.25rem_minmax(5.5rem,7.25rem)_2rem] sm:items-center";

/** Unified Übersicht tracks with leading reorder/scheduling grip (Umsetzungsplanung). */
export const SCE_CD_OVERVIEW_UNIFIED_GRID_WITH_GRIP =
  "sm:grid-cols-[auto_8.5rem_minmax(0,1.15fr)_minmax(0,0.88fr)_5.75rem_12.25rem_minmax(5.5rem,7.25rem)_2rem] sm:items-center";

/** Übersicht rows — flush horizontal inset with section table headers. */
export const SCE_CD_OVERVIEW_ROW_CLASS =
  "grid gap-x-3 gap-y-0 px-0 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)] focus-within:bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)] sm:gap-3 sm:py-1.5";

/** `data-sce-overview-col` values — used for alignment regression tests. */
export const SCE_CD_OVERVIEW_GRID_COLUMNS = [
  "referenz",
  "titel",
  "kontext",
  "status",
  "progress",
  "verantwortlich",
  "actions",
] as const;

export type SceCdOverviewGridColumn = (typeof SCE_CD_OVERVIEW_GRID_COLUMNS)[number];

/** Shared Vereinsentwicklung backlog table grids (desktop). */
export const SCE_CD_BACKLOG_GRID_STRATEGY =
  "sm:grid-cols-[minmax(5.75rem,8.5rem)_minmax(0,1.35fr)_minmax(0,0.75fr)_minmax(0,1.2fr)_auto] sm:items-center";

export const SCE_CD_BACKLOG_GRID_ZIEL =
  "sm:grid-cols-[minmax(5.75rem,7.75rem)_minmax(8rem,1.05fr)_minmax(6.5rem,1.15fr)_minmax(5.25rem,5.75rem)_minmax(9.5rem,max-content)_minmax(5.5rem,0.82fr)_auto] sm:items-center";

export const SCE_CD_BACKLOG_GRID_TASK =
  "sm:grid-cols-[auto_minmax(5.75rem,7.75rem)_minmax(8rem,1.2fr)_minmax(6rem,1fr)_minmax(5.25rem,5.75rem)_minmax(5.5rem,0.88fr)_auto] sm:items-center";

export const SCE_CD_BACKLOG_GRID_TASK_PROGRESS =
  "sm:grid-cols-[auto_minmax(5.75rem,8.5rem)_minmax(0,1.15fr)_minmax(0,0.8fr)_minmax(0,5.5rem)_minmax(0,0.85fr)_minmax(0,1rem)_auto] sm:items-center";

export const SCE_CD_BACKLOG_ROW_CLASS =
  "grid gap-x-3 gap-y-0 py-2 px-0.5 transition-colors hover:bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)] focus-within:bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)] sm:gap-3 sm:py-1.5";