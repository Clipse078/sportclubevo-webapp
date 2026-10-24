/**
 * FIN-01D R5 — shared Finance workspace presentation (SCE Design System surfaces).
 * Opaque dark functional layers over the authenticated SCE background artwork.
 */
import { cn } from "@/lib/cn";
import { SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS } from "@/lib/design-system/sce-form-control-micro-ux";
import {
  SCE_SURFACE_DENSE_PANEL,
  SCE_SURFACE_STANDARD_PANEL,
} from "@/lib/shell/sce-surface-system";

/** Bounded content column — aligns context, tables, summary, and primary actions. */
export const FINANCE_WORKSPACE_STACK_CLASS =
  "mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4";

/** FIN-04A R2 — tighter vertical rhythm for forecast workspace. */
export const FINANCE_FORECAST_WORKSPACE_STACK_CLASS =
  "mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-3";

/** FIN-04C-05R5 — one coherent rolling-forecast workspace (not independent dashboard cards). */
export const FINANCE_FORECAST_WORKSPACE_SURFACE_CLASS = cn(
  SCE_SURFACE_STANDARD_PANEL,
  "min-w-0 divide-y divide-[var(--sce-surface-border-subtle)] p-0",
);

/** Padding rhythm for subsections inside {@link FINANCE_FORECAST_WORKSPACE_SURFACE_CLASS}. */
export const FINANCE_FORECAST_WORKSPACE_SECTION_CLASS = "min-w-0 px-4 py-3 sm:px-5";

/** Typography-only subsection titles — no nested dark header bars. */
export const FINANCE_FORECAST_ANALYSIS_HEADING_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-[var(--muted)]";

/**
 * Formal reforecast dialog body — viewport-safe flex scroll region (header/footer stay fixed).
 * Tall desktop viewports may show all content without scroll; constrained height scrolls here only.
 */
export const FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS =
  "min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-3 text-sm text-[var(--text-2)]";

/** Primary functional card (overview nudges, settings sections, empty states). */
export const FINANCE_FUNCTIONAL_SURFACE_CLASS = cn(SCE_SURFACE_STANDARD_PANEL, "px-5 py-6");

/** Income / expense / structure working blocks. */
export const FINANCE_SECTION_SURFACE_CLASS = cn(
  SCE_SURFACE_STANDARD_PANEL,
  "min-w-0 overflow-hidden p-0",
);

export const FINANCE_SECTION_HEADER_CLASS =
  "border-b border-[var(--sce-surface-border)] bg-[var(--sce-surface-dense)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)]";

export const FINANCE_TABLE_HEAD_ROW_CLASS =
  "border-b border-[var(--sce-surface-border-subtle)] bg-[var(--sce-surface-dense)] text-left text-xs font-medium uppercase tracking-wide text-[var(--muted)]";

export const FINANCE_TABLE_ROW_CLASS =
  "border-b border-[var(--sce-surface-border-subtle)]/70 last:border-0";

/** Compact year + currency context — not a heavy header card. */
export const FINANCE_CONTEXT_STRIP_CLASS = cn(
  SCE_SURFACE_DENSE_PANEL,
  "flex flex-wrap items-end gap-x-6 gap-y-3 px-4 py-3",
);

/** Read-only inherited currency — clearly context, not a control. */
export const FINANCE_CURRENCY_CONTEXT_CLASS =
  "flex min-h-9 items-center text-sm font-semibold tracking-wide text-[var(--foreground)] tabular-nums";

/** Subordinate workspace persistence hint (FIN-02A R2) — below governance status in context strip. */
export const FINANCE_BUDGET_PERSISTENCE_INDICATOR_CLASS =
  "text-xs text-[var(--muted)] tabular-nums";

export const FINANCE_SUMMARY_SURFACE_CLASS = cn(SCE_SURFACE_STANDARD_PANEL, "px-4 py-4");

/** Compact analytical summary strip (FIN-04A R2 forecast). */
export const FINANCE_SUMMARY_STRIP_SURFACE_CLASS = cn(SCE_SURFACE_DENSE_PANEL, "px-4 py-3");

export const FINANCE_SUMMARY_GRID_CLASS = "grid min-w-0 gap-4 sm:grid-cols-3";

export const FINANCE_SUMMARY_STRIP_GRID_CLASS =
  "grid min-w-0 gap-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[var(--sce-surface-border-subtle)]";

export const FINANCE_SUMMARY_LABEL_CLASS = "text-xs font-medium text-[var(--muted)]";

export const FINANCE_SUMMARY_VALUE_CLASS =
  "mt-1 text-base font-semibold tabular-nums text-[var(--foreground)]";

export const FINANCE_SUMMARY_STRIP_VALUE_CLASS =
  "mt-0.5 text-sm font-semibold tabular-nums text-[var(--foreground)]";

export const FINANCE_SUMMARY_RESULT_VALUE_CLASS =
  "mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]";

export const FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS =
  "mt-0.5 text-sm font-semibold tabular-nums text-[var(--foreground)]";

/** Stacked income/expense forecast tables — shared workspace, minimal gap. */
export const FINANCE_FORECAST_TABLES_STACK_CLASS = "flex min-w-0 flex-col gap-2";

/** Editable forecast cell — integrates into table until focused (FIN-04A R2). */
export const FINANCE_FORECAST_MONEY_CELL_INPUT_CLASS = cn(
  "w-full min-w-[6.5rem] max-w-[9rem] border border-transparent bg-transparent py-1 pe-2 ps-2 text-end text-sm font-medium tabular-nums text-[var(--foreground)] shadow-none",
  "rounded-[var(--radius-sm,0.25rem)]",
  "hover:border-[var(--sce-surface-border-subtle)] hover:bg-[var(--surface-2)]/35",
  "focus:border-[var(--sce-color-border-standard)] focus:bg-[var(--surface-1)]",
  SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
);

export const FINANCE_FORECAST_MONEY_CELL_READ_ONLY_CLASS =
  "inline-block min-w-[6.5rem] max-w-[9rem] py-1 pe-2 ps-2 text-end text-sm font-medium tabular-nums";

/** Budget amount cells — local-first inputs stay native for performance (FIN-01D R3). */
export const FINANCE_BUDGET_AMOUNT_INPUT_CLASS = cn(
  "fca-input w-full max-w-[11rem] text-right tabular-nums",
  SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
);

export const FINANCE_SETTINGS_SECTION_CLASS = cn(SCE_SURFACE_STANDARD_PANEL, "p-5");

export const FINANCE_STRUCTURE_TREE_SURFACE_CLASS = cn(
  SCE_SURFACE_STANDARD_PANEL,
  "max-h-[min(32rem,70vh)] overflow-y-auto overflow-x-hidden p-3 sm:p-4",
);

export const FINANCE_FIELD_CONTROL_CLASS = "fca-input w-full text-sm";

export const FINANCE_EMPTY_DRAFT_SURFACE_CLASS = cn(
  SCE_SURFACE_STANDARD_PANEL,
  "border-dashed px-5 py-6",
);
