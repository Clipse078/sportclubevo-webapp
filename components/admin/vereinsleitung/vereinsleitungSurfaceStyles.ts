import { SCE_WORKSPACE_FEATURE_CARD_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";

/** Dark SCE functional panel for Vereinsleitung modules (DS-10R2). */
export const VEREINSLEITUNG_PANEL_CLASS = SCE_WORKSPACE_FEATURE_CARD_CLASS;

export const VEREINSLEITUNG_INNER_ROW_CLASS =
  "flex items-start justify-between gap-3 rounded-[var(--sce-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-4 transition hover:bg-[var(--surface)]";

export const VEREINSLEITUNG_SECONDARY_CHROME_LINK =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]";

export const VEREINSLEITUNG_MUTED_BADGE_CLASS =
  "rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-2)]";
