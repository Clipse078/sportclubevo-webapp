import { SCE_WORKSPACE_FEATURE_CARD_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";

/** Canonical dark functional panel (cards, form sections, admin modules). */
export const SCE_FUNCTIONAL_PANEL_CLASS = SCE_WORKSPACE_FEATURE_CARD_CLASS;

export const SCE_FUNCTIONAL_INNER_ROW_CLASS =
  "flex items-start justify-between gap-3 rounded-[var(--sce-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-4 transition hover:bg-[var(--surface)]";

export const SCE_FUNCTIONAL_SECONDARY_CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-2)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]";

export const SCE_FUNCTIONAL_MUTED_BADGE_CLASS =
  "rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-2)]";
