/**
 * SCE-NAVBAR-UPGRADE-01-R5 — canonical authenticated application grid (brand rail + workspace).
 *
 * CSS tokens and layout class names are defined on
 * `.sce-authenticated-app-shell.sce-app-shell-global-nav` in global-app-navigation.css.
 */

/** Root grid: brand rail column + workspace column (mirrors navigation spine). */
export const SCE_APP_SHELL_PAGE_GRID_CLASS = "sce-app-shell-page-grid";

/** Intentional empty brand/context column below sticky navigation (desktop). */
export const SCE_APP_SHELL_RAIL_SPACER_CLASS = "sce-app-shell-rail-spacer";

/** Scrollable page workspace — shares L1/L2/L3 horizontal start edge. */
export const SCE_APP_SHELL_WORKSPACE_CLASS = "sce-app-shell-workspace";

/** Full-bleed background wrapper; pair with {@link SCE_APP_SHELL_FULL_BLEED_INNER_CLASS}. */
export const SCE_APP_SHELL_FULL_BLEED_SURFACE_CLASS = "sce-app-shell-full-bleed-surface";

/** Content aligned to the workspace column inside a full-bleed surface. */
export const SCE_APP_SHELL_FULL_BLEED_INNER_CLASS = "sce-app-shell-full-bleed-inner";

export const SCE_SHELL_RAIL_WIDTH_VAR = "--sce-shell-rail-width";
export const SCE_SHELL_WORKSPACE_GUTTER_VAR = "--sce-shell-workspace-gutter";
export const SCE_SHELL_OUTER_INLINE_PADDING_VAR = "--sce-shell-outer-inline-padding";
export const SCE_SHELL_WORKSPACE_START_VAR = "--sce-shell-workspace-start";
