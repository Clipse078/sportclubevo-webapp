/**
 * SCE-NAVBAR-UPGRADE-01-R8 — authenticated page shell grid (decoupled from navigation spine).
 *
 * Navigation tokens live on `.sce-authenticated-app-shell.sce-app-shell-global-nav` in
 * global-app-navigation.css. Page content must not mirror the navigation brand rail column.
 */

/** Root page container — full width with canonical page gutters only. */
export const SCE_APP_SHELL_PAGE_GRID_CLASS = "sce-app-shell-page-grid";

/** @deprecated R8: page grid no longer renders a navigation rail spacer column. */
export const SCE_APP_SHELL_RAIL_SPACER_CLASS = "sce-app-shell-rail-spacer";

/** Scrollable page workspace within page gutters. */
export const SCE_APP_SHELL_WORKSPACE_CLASS = "sce-app-shell-workspace";

/** Full-bleed background wrapper; pair with {@link SCE_APP_SHELL_FULL_BLEED_INNER_CLASS}. */
export const SCE_APP_SHELL_FULL_BLEED_SURFACE_CLASS = "sce-app-shell-full-bleed-surface";

/** Content aligned to page gutters inside a full-bleed surface. */
export const SCE_APP_SHELL_FULL_BLEED_INNER_CLASS = "sce-app-shell-full-bleed-inner";

/** Navigation-only: brand / tenant identity rail width (Row 1 / Row 2). */
export const SCE_NAV_IDENTITY_WIDTH_VAR = "--sce-nav-brand-rail-width";

export const SCE_NAV_WORKSPACE_GUTTER_VAR = "--sce-nav-workspace-gutter";

/** Navigation-only: outer padding for spine rows (not page gutters). */
export const SCE_SHELL_OUTER_INLINE_PADDING_VAR = "--sce-shell-outer-inline-padding";

/** Navigation-only: horizontal start of L1/L2 workspace (do not use for page content). */
export const SCE_SHELL_WORKSPACE_START_VAR = "--sce-shell-workspace-start";

/** @deprecated alias — prefer {@link SCE_NAV_IDENTITY_WIDTH_VAR}. */
export const SCE_SHELL_RAIL_WIDTH_VAR = "--sce-shell-rail-width";

/** @deprecated R8: navigation gutter; not applied to page bodies. */
export const SCE_SHELL_WORKSPACE_GUTTER_VAR = "--sce-nav-workspace-gutter";
