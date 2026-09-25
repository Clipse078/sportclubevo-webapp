/**
 * PLANNING-UX-04 — shared SCE planning create/edit layout tokens.
 * Reference: TRAININGCENTER-UX-03R2 single-session editor.
 */

/** Premium planning workspace width (responsive below breakpoint). */
export const PLANNING_EDITOR_MAX_WIDTH_CLASS = "mx-auto w-full max-w-[min(72rem,100%)]";

/** Single coherent create/edit workspace surface. */
export const PLANNING_EDITOR_SURFACE_CLASS =
  "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 shadow-sm";

/** Inner padding for section panels. */
export const PLANNING_EDITOR_SECTION_PADDING_CLASS = "px-3 py-3 md:px-4 md:py-3.5";

/** Primary + participation side-by-side grid (training-style). */
export const PLANNING_EDITOR_PRIMARY_WORKSPACE_GRID_CLASS =
  "grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-12 lg:gap-4";

export const PLANNING_EDITOR_PRIMARY_COLUMN_CLASS = "min-w-0 self-start lg:col-span-7 xl:col-span-8";

export const PLANNING_EDITOR_SECONDARY_COLUMN_CLASS = "min-w-0 self-start lg:col-span-5 xl:col-span-4";

/** Context rail (publication, status) — desktop/laptop right column; stacks on narrow viewports. */
export const PLANNING_EDITOR_MAIN_RAIL_GRID =
  "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,22rem)]";

export const PLANNING_EDITOR_RAIL_ASIDE =
  "min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start";

export const PLANNING_EDITOR_STICKY_FOOTER_RESERVE_CLASS = "pb-24";

export const PLANNING_EDITOR_STICKY_FOOTER_CLASS =
  "sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--surface)]/85";

export const PLANNING_EDITOR_TIME_FIELD_WIDTH_CLASS = "w-28 min-w-[7rem]";

export const PLANNING_EDITOR_COMPACT_TIME_INPUT_CLASS =
  "fca-input h-8 w-full px-2 py-0.5 text-sm font-medium tabular-nums";

export const PLANNING_EDITOR_DATETIME_GRID_CLASS =
  "grid min-w-0 gap-3 sm:grid-cols-[minmax(10.5rem,1.35fr)_minmax(7.25rem,0.52fr)_minmax(7.25rem,0.52fr)] sm:items-end";

export const PLANNING_EDITOR_DATE_INPUT_CLASS =
  "fca-input h-8 w-full min-w-[10.5rem] px-2.5 text-sm tabular-nums disabled:cursor-not-allowed";

export const PLANNING_EDITOR_FIELD_GRID_CLASS = "grid min-w-0 gap-3 sm:grid-cols-2";

/** Two-column form fields inside a section. */
export const PLANNING_EDITOR_FORM_GRID_CLASS = "grid min-w-0 gap-4 md:grid-cols-2";

/** Subsection label inside a resources block (pitch, dressing room, etc.). */
export const PLANNING_RESOURCE_SECTION_LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-[var(--muted)]";
