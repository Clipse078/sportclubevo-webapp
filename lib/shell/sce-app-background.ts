/**
 * SCE-VISUAL-01 — canonical authenticated SportClubEvo application canvas.
 * Single source for the public static asset path (served from /public).
 */
export const SCE_AUTHENTICATED_APP_BACKGROUND_PATH =
  "/images/background/SCE_background.png";

/** CSS `background-image` value for shell tokens. */
export const SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE = `url("${SCE_AUTHENTICATED_APP_BACKGROUND_PATH}")`;

/** Root wrapper class applied only on the authenticated admin application shell. */
export const SCE_AUTHENTICATED_APP_SHELL_CLASS = "sce-authenticated-app-shell";
