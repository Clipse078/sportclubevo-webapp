/**
 * Shared layout tokens for TrainingCenter create/edit/allocation surfaces.
 */

/** Premium form workspace width (responsive below breakpoint). */
export const TRAINING_FORM_MAX_WIDTH_CLASS = "mx-auto w-full max-w-[min(72rem,100%)]";

/** Reserve space so sticky footers never cover resource pickers. */
export const TRAINING_FORM_STICKY_FOOTER_RESERVE_CLASS = "pb-24";

export const TRAINING_FORM_STICKY_FOOTER_CLASS =
  "sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t border-[var(--border)] bg-[var(--background)]/95 px-1 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--background)]/80";
