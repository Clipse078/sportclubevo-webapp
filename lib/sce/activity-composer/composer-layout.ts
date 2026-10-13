/**
 * SCE-ACTIVITY-CREATE-01B — composer container geometry (shared workflow, mode-specific layout).
 * @see docs/design/SCE-ACTIVITY-CREATION.md
 */

/** Root panel — mode modifiers: `--overlay`, `--fullscreen` in globals.css */
export const SCE_ACTIVITY_COMPOSER_PANEL_CLASS = "sce-activity-composer-panel";

/** Canonical dark scroll treatment for elevated SCE surfaces (reuses sidebar/explorer language). */
export const SCE_SCROLL_REGION_DARK_CLASS = "sce-scroll-region-dark";

/** Internal scroll region in overlay/fullscreen (header/tabs/footer stay fixed). */
export const SCE_ACTIVITY_COMPOSER_BODY_SCROLL_TEST_ID = "sce-activity-composer-body";
