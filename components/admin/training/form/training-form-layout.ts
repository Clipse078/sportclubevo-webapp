/**
 * Shared layout tokens for TrainingCenter create/edit/allocation surfaces.
 */

/** Premium form workspace width (responsive below breakpoint). */
export const TRAINING_FORM_MAX_WIDTH_CLASS = "mx-auto w-full max-w-[min(72rem,100%)]";

/** Reserve space so sticky footers never cover resource pickers. */
export const TRAINING_FORM_STICKY_FOOTER_RESERVE_CLASS = "pb-24";

export const TRAINING_FORM_STICKY_FOOTER_CLASS =
  "sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--surface)]/85";

/** Single coherent edit/create workspace surface. */
export const TRAINING_FORM_WORKSPACE_SURFACE_CLASS =
  "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 shadow-sm";

/**
 * Compact native `input[type=time]` width — fits HH:MM plus the browser clock
 * affordance without clipping (matches create-form `w-28` labels).
 */
export const TRAINING_FORM_TIME_FIELD_WIDTH_CLASS = "w-28 min-w-[7rem]";

/** Shared class for compact training HH:MM inputs (create + weekday schedule). */
export const TRAINING_FORM_COMPACT_TIME_INPUT_CLASS =
  "fca-input h-8 w-full px-2 py-0.5 text-sm font-medium tabular-nums";

/**
 * Grid track width for Von/Bis columns in TrainingWeekdayScheduleEditor —
 * must stay in sync with TRAINING_FORM_TIME_FIELD_WIDTH_CLASS (7rem).
 */
export const TRAINING_WEEKDAY_SCHEDULE_TIME_GRID_TRACK = "7rem";

/** Full sm+ grid template for weekday schedule rows (static string for Tailwind). */
export const TRAINING_WEEKDAY_SCHEDULE_GRID_CLASS =
  "sm:grid-cols-[minmax(0,1.2fr)_7rem_7rem_minmax(4.5rem,0.8fr)]";

/** Single-session edit — date + start + end on one baseline without clipping localized dates. */
export const TRAINING_SESSION_EDIT_DATETIME_GRID_CLASS =
  "grid min-w-0 gap-3 sm:grid-cols-[minmax(10.5rem,1.35fr)_minmax(7.25rem,0.52fr)_minmax(7.25rem,0.52fr)] sm:items-end";

export const TRAINING_SESSION_EDIT_DATE_INPUT_CLASS =
  "fca-input h-8 w-full min-w-[10.5rem] px-2.5 text-sm tabular-nums disabled:cursor-not-allowed";
