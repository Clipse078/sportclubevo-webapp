/**
 * SCE-RESPONSIVE-01 — canonical authenticated-app layout contract.
 *
 * Overlays portalled to the document use the content viewport (browser width minus
 * the effective sidebar inset), not raw 100vw, so large dialogs stay in the main
 * workspace at 100% zoom with the sidebar expanded.
 *
 * CSS variables (--sce-content-viewport-width, etc.) are defined in app/globals.css.
 * Tailwind arbitrary values reference those vars where needed.
 */

/** Viewport-fixed portal root ({@code inset: 0}) — transparent coordinate system, no sidebar inset. */
export const SCE_OVERLAY_ROOT = "sce-modal-overlay-root";

/**
 * Sidebar-aware flex centering region within {@link SCE_OVERLAY_ROOT} (application band only).
 */
export const SCE_OVERLAY_CONTENT_VIEWPORT = "sce-modal-overlay-content-viewport";

/** SCE dialog presentation variants (compact → workspace). */
export type SceDialogVariant = "compact" | "standard" | "form" | "workspace";

/** Canonical variant max widths (px) — mirrored in app/globals.css where applicable. */
export const SCE_DIALOG_COMPACT_MAX_PX = 520;
export const SCE_DIALOG_STANDARD_MAX_PX = 720;
export const SCE_DIALOG_FORM_MAX_PX = 960;

export const SCE_DIALOG_VARIANT_COMPACT =
  "sce-dialog-variant-compact max-w-[min(32.5rem,var(--sce-dialog-compact-max-width))]";
export const SCE_DIALOG_VARIANT_STANDARD =
  "sce-dialog-variant-standard max-w-[min(45rem,var(--sce-dialog-standard-max-width))]";
export const SCE_DIALOG_VARIANT_FORM =
  "sce-dialog-variant-form max-w-[min(60rem,var(--sce-dialog-form-max-width))]";
export const SCE_DIALOG_VARIANT_WORKSPACE =
  "sce-dialog-variant-workspace max-w-[min(100%,var(--sce-dialog-workspace-max-width))]";

/** Workspace-scale dialog shell (PLANNING-UX-03D reference). */
export const SCE_DIALOG_WORKSPACE_PANEL = [
  "relative z-10 flex w-full min-w-0 flex-col overflow-hidden rounded-2xl",
  "border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)] outline-none",
  "max-h-[var(--sce-dialog-max-height)]",
  SCE_DIALOG_VARIANT_WORKSPACE,
].join(" ");

/** Standard dialog panel widths — sized against content viewport via CSS vars. */
export const SCE_DIALOG_PANEL_BASE =
  "relative z-10 flex w-full min-w-0 max-w-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)] outline-none max-h-[var(--sce-dialog-max-height)]";

/** @deprecated Prefer {@link SCE_DIALOG_VARIANT_COMPACT} — kept for Dialog size="sm" mapping. */
export const SCE_DIALOG_SIZE_SM = SCE_DIALOG_VARIANT_COMPACT;
export const SCE_DIALOG_SIZE_MD =
  "max-w-[min(32rem,var(--sce-dialog-standard-max-width))]";
export const SCE_DIALOG_SIZE_LG =
  "max-w-[min(42rem,var(--sce-dialog-standard-max-width))]";
export const SCE_DIALOG_SIZE_XL = SCE_DIALOG_VARIANT_FORM;

export const SCE_DIALOG_HEADER =
  "flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-4";
export const SCE_DIALOG_BODY = "min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm text-[var(--text-2)]";
export const SCE_DIALOG_FOOTER =
  "flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4";

/** Main authenticated column — flex child must shrink. */
export const SCE_APP_MAIN_COLUMN = "flex min-h-screen min-w-0 flex-1 flex-col";

/** Desired workspace dialog cap (px) — mirrored in CSS as --sce-dialog-workspace-desired-max. */
export const SCE_DIALOG_WORKSPACE_DESIRED_MAX_PX = 1160;
