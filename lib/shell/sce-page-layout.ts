/**
 * SCE-NAVBAR-UPGRADE-01-R8 — canonical page alignment (independent from navigation grid).
 *
 * Navigation identity rails align L1/L2 only. Application page content uses
 * responsive page gutters and an explicit width mode — never --sce-shell-workspace-start.
 */

export const SCE_PAGE_GUTTER_VAR = "--sce-page-gutter";

/** Full-width operational workspaces (Wochenplaner, timelines, dense tables). */
export const SCE_PAGE_WIDTH_OPERATIONAL = "operational" as const;

/** Default readable admin pages. */
export const SCE_PAGE_WIDTH_READABLE = "readable" as const;

/** Dashboard / card home — deliberate max-width, centered. */
export const SCE_PAGE_WIDTH_DASHBOARD = "dashboard" as const;

export type ScePageWidthMode =
  | typeof SCE_PAGE_WIDTH_OPERATIONAL
  | typeof SCE_PAGE_WIDTH_READABLE
  | typeof SCE_PAGE_WIDTH_DASHBOARD;

export const SCE_PAGE_SHELL_WIDTH_CLASS: Record<ScePageWidthMode, string> = {
  operational: "sce-page-shell--operational",
  readable: "sce-page-shell--readable",
  dashboard: "sce-page-shell--dashboard",
};

export const SCE_PAGE_LAYOUT_RULE =
  "Navigation identity rails never dictate the left edge of application page content. Pages use canonical responsive page gutters (--sce-page-gutter) and an appropriate content-width mode.";

export const SCE_NAVIGATION_GRID_RULE =
  "Navigation chrome uses the brand rail + workspace + utilities grid (--sce-nav-brand-rail-width, --sce-nav-workspace-gutter) inside Row 1 and Row 2 only.";

export const SCE_PAGE_GRID_RULE =
  "Page bodies use sce-app-shell-page-grid with horizontal padding from --sce-page-gutter; operational surfaces stay full width within gutters.";
