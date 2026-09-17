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
