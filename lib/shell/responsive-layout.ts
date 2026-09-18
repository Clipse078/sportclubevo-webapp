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

/** Full-viewport backdrop; panel positioning uses {@link SCE_OVERLAY_CONTENT_VIEWPORT}. */
export const SCE_OVERLAY_ROOT = "fixed inset-0 z-50";

/**
 * Usable horizontal band for centered overlays while the persistent sidebar is in flow.
 * Backdrop remains full-screen; only the flex centering region is inset.
 */
export const SCE_OVERLAY_CONTENT_VIEWPORT =
  "fixed top-0 bottom-0 right-0 left-[var(--sce-sidebar-effective-width)] flex items-center justify-center p-[var(--sce-overlay-gutter)] sm:p-[calc(var(--sce-overlay-gutter)*1.25)]";

/** Workspace-scale dialog shell (PLANNING-UX-03D reference). */
export const SCE_DIALOG_WORKSPACE_PANEL =
  "relative z-10 flex w-full max-w-[var(--sce-dialog-workspace-max-width)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)] outline-none max-h-[var(--sce-dialog-max-height)]";

/** Standard dialog panel widths — sized against content viewport via CSS vars. */
export const SCE_DIALOG_PANEL_BASE =
  "relative z-10 flex w-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)] outline-none max-h-[var(--sce-dialog-max-height)]";

export const SCE_DIALOG_SIZE_SM = "max-w-[min(24rem,var(--sce-dialog-standard-max-width))]";
export const SCE_DIALOG_SIZE_MD = "max-w-[min(32rem,var(--sce-dialog-standard-max-width))]";
export const SCE_DIALOG_SIZE_LG = "max-w-[min(42rem,var(--sce-dialog-standard-max-width))]";
export const SCE_DIALOG_SIZE_XL = "max-w-[min(56rem,var(--sce-dialog-standard-max-width))]";

export const SCE_DIALOG_HEADER =
  "flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-4";
export const SCE_DIALOG_BODY = "min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm text-[var(--text-2)]";
export const SCE_DIALOG_FOOTER =
  "flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4";

/** Main authenticated column — flex child must shrink. */
export const SCE_APP_MAIN_COLUMN = "flex min-h-screen min-w-0 flex-1 flex-col";

/** Desired workspace dialog cap (px) — mirrored in CSS as --sce-dialog-workspace-desired-max. */
export const SCE_DIALOG_WORKSPACE_DESIRED_MAX_PX = 1560;
