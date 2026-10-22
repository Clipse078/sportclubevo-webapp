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

export const FINANCE_SUMMARY_GRID_CLASS = "grid min-w-0 gap-4 sm:grid-cols-3";

export const FINANCE_SUMMARY_LABEL_CLASS = "text-xs font-medium text-[var(--muted)]";

export const FINANCE_SUMMARY_VALUE_CLASS =
  "mt-1 text-base font-semibold tabular-nums text-[var(--foreground)]";

export const FINANCE_SUMMARY_RESULT_VALUE_CLASS =
  "mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]";

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
