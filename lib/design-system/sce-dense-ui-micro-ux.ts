/**
 * SCE-DESIGN-SYSTEM-08 — dense UI micro-UX class recipes & governance markers.
 */

export const SCE_DENSE_UI_MICRO_UX_GOVERNANCE = {
  WORLD_CLASS_MICRO_UX_REQUIRED: "YES",
  MICRO_STATE_COVERAGE_REQUIRED: "YES",
  MICRO_ALIGNMENT_CONSISTENCY_REQUIRED: "YES",
  MICRO_RESPONSIVE_QUALITY_REQUIRED: "YES",
  MICRO_ACCESSIBILITY_REQUIRED: "YES",
  LOCAL_MICRO_PATTERN_DRIFT_ALLOWED: "NO",
} as const;

export const SCE_DENSE_UI_MICRO_UX_DOC_MARKERS = [
  "DENSE_UI_SYSTEM_PRODUCT_WIDE",
  "TABLE_SYSTEM_CANONICAL",
  "LIST_SYSTEM_CANONICAL",
  "DENSE_SURFACE_CANONICAL",
  "ROW_ACTION_SYSTEM_CANONICAL",
  "DENSE_FILTER_TOOLBAR_CANONICAL",
  "TABLE_WHEN_COLUMN_RELATIONSHIPS_MATTER",
  "LIST_WHEN_ENTITY_HIERARCHY_MATTERS",
  "CARD_GRID_AS_DEFAULT_DENSE_UI",
  "CARD_SOUP_ALLOWED",
  "SCE_DESIGN_SYSTEM_COMPLIANCE",
] as const;

/** Header row — restrained, aligned with dense grid/table body padding. */
export const SCE_DENSE_HEADER_ROW_CLASS =
  "border-b border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] md:px-5";

/** Interactive dense row — pointer + keyboard; not a floating card. */
export const SCE_DENSE_ROW_BASE_CLASS =
  "group relative border-b border-[var(--border)] bg-[var(--surface)] transition-colors last:border-b-0";

export const SCE_DENSE_ROW_INTERACTIVE_CLASS =
  "hover:bg-[var(--surface-2)]/70 focus-within:bg-[var(--surface-2)]/70 focus-within:ring-1 focus-within:ring-inset focus-within:ring-[var(--sce-primary)]/25";

export const SCE_DENSE_ROW_SELECTED_CLASS =
  "bg-[var(--sce-primary)]/[0.06] hover:bg-[var(--sce-primary)]/[0.08]";

export const SCE_DENSE_ROW_ATTENTION_CLASS = "border-l-2 border-l-amber-500/80 pl-[calc(1.25rem-2px)]";

export const SCE_DENSE_ROW_DISABLED_CLASS = "opacity-55 pointer-events-none";

/** Standard horizontal padding for dense cells. */
export const SCE_DENSE_CELL_X_CLASS = "px-4 md:px-5";

/** Vertical rhythm for admin dense rows (comfortable-dense tier). */
export const SCE_DENSE_ROW_Y_CLASS = "py-3 md:py-3.5";

/** Compact role / function chip inside dense rows (not oversized pills). */
export const SCE_DENSE_META_CHIP_CLASS =
  "inline-flex max-w-full items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 px-1.5 py-0.5 text-[0.6875rem] font-medium leading-tight text-[var(--foreground)]";

/** Secondary metadata line in dense rows. */
export const SCE_DENSE_META_TEXT_CLASS = "text-xs leading-snug text-[var(--text-2)]";

/** Mobile stacked metadata block under primary identity. */
export const SCE_DENSE_MOBILE_META_GRID_CLASS =
  "mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs md:hidden";

export const SCE_DENSE_DATA_TABLE_SHELL_CLASS =
  "overflow-x-auto rounded-[var(--radius-lg)] ring-1 ring-[color-mix(in_srgb,var(--border)_55%,transparent)]";

export const SCE_DENSE_DATA_TABLE_CLASS = "min-w-full text-sm";

export const SCE_DENSE_DATA_TABLE_HEAD_CLASS =
  "bg-[color-mix(in_srgb,var(--muted)_14%,transparent)] text-left text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]";

export const SCE_DENSE_DATA_TABLE_ROW_CLASS =
  "border-t border-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] focus-within:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]";

export const SCE_DENSE_DATA_TABLE_CELL_CLASS =
  "px-3 py-3 align-middle sm:px-4 sm:py-3.5";

export const SCE_DENSE_SORT_BUTTON_CLASS =
  "inline-flex items-center gap-1 rounded-md px-0.5 py-0.5 -mx-0.5 text-inherit transition hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]/40";
