/**
 * FIN-05G — attention driver layout (presentation).
 * Keeps favourable/unfavourable drivers visually paired without full-width separation on desktop.
 */

/** Max width for the two-driver grid so columns stay readable and adjacent. */
export const FINANCE_COMPARATIVE_ATTENTION_DRIVERS_GRID_CLASS =
  "grid max-w-2xl gap-3 sm:grid-cols-2 sm:gap-4";

export const FINANCE_COMPARATIVE_ATTENTION_OVERALL_CLASS =
  "text-sm font-semibold text-[var(--foreground)]";

export const FINANCE_COMPARATIVE_ATTENTION_DRIVER_LABEL_CLASS =
  "text-xs font-medium text-[var(--muted)]";

export const FINANCE_COMPARATIVE_ATTENTION_DRIVER_DETAIL_CLASS =
  "mt-0.5 text-sm font-medium tabular-nums text-[var(--foreground)]";

export const FINANCE_COMPARATIVE_ATTENTION_DRIVER_BUTTON_CLASS =
  "w-full rounded-md px-2 py-1.5 text-left hover:bg-[var(--surface-2)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]";
