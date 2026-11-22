/**
 * PR #1025 — Dokumentation workspace visual contract (white canvas under dark app chrome).
 * Scoped via {@link TenantDocumentationWhiteSurface} (`data-sce-theme="white"`).
 */

export const TENANT_DOCUMENTATION_WHITE_SURFACE_ATTR = {
  "data-sce-theme": "white",
  className: "sce-theme-white tenant-documentation-white-surface",
} as const;

/** Full-bleed workspace row: light gutter between sidebar and document. */
export const TENANT_DOCUMENTATION_WORKSPACE_ROOT_CLASS =
  "-mx-4 -mt-2 flex min-h-[calc(100vh-3.5rem)] border-t border-[var(--sce-color-border-standard)] bg-[var(--sce-surface-subtle)] sm:-mx-6 lg:-mx-8";

export const TENANT_DOCUMENTATION_SIDEBAR_CLASS =
  "w-72 shrink-0 border-r border-[var(--sce-color-border-standard)] bg-[var(--sidebar-bg)] p-4 text-[var(--sce-color-text-primary)]";

export const TENANT_DOCUMENTATION_MAIN_CANVAS_CLASS =
  "mx-auto w-full max-w-4xl flex-1 bg-white px-6 py-5 text-[var(--sce-color-text-primary)] lg:px-10";

/** Archiv / Papierkorb / manage-only routes — same light gutter as workspace shell. */
export const TENANT_DOCUMENTATION_MANAGE_ROUTE_ROOT_CLASS =
  "relative left-1/2 right-1/2 -mx-[50vw] flex min-h-[calc(100vh-3.5rem)] w-screen max-w-[100vw] border-t border-slate-200 bg-slate-50";

export const TENANT_DOCUMENTATION_MANAGE_PAGE_CLASS =
  "mx-auto w-full max-w-3xl flex-1 bg-white px-4 py-6 text-slate-900 sm:px-6 lg:px-10";

export const TENANT_DOCUMENTATION_SECONDARY_BUTTON_CLASS =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium !text-slate-900 hover:bg-slate-50 disabled:opacity-50";

export const TENANT_DOCUMENTATION_LIST_PANEL_CLASS =
  "divide-y divide-[var(--sce-color-border-standard)] rounded-lg border border-[var(--sce-color-border-standard)] bg-white";