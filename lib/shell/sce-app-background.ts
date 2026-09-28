/**
 * SCE-VISUAL-01 / SCE-UX-BG-01 / SCE-UX-BG-01R2 — canonical authenticated SportClubEvo application canvas.
 * Single source for the public static asset path (served from /public).
 *
 * Precedence: explicit module/user/tenant artwork overrides (when present) → this default →
 * `--sce-app-background` / `--background` CSS fallback.
 */
export const SCE_AUTHENTICATED_APP_BACKGROUND_PATH =
  "/images/background/SCE_background.png";

/**
 * Bump when the PNG bytes at {@link SCE_AUTHENTICATED_APP_BACKGROUND_PATH} change while the filename stays the same.
 * Rendered shell CSS must use {@link SCE_AUTHENTICATED_APP_BACKGROUND_URL}, not the bare path.
 */
export const SCE_AUTHENTICATED_APP_BACKGROUND_CACHE_VERSION = 2;

/** Cache-busted public URL for browsers/CDN (filename unchanged after R2 asset swap). */
export const SCE_AUTHENTICATED_APP_BACKGROUND_URL = `${SCE_AUTHENTICATED_APP_BACKGROUND_PATH}?v=${SCE_AUTHENTICATED_APP_BACKGROUND_CACHE_VERSION}`;

/** SHA-256 of the approved `public/images/background/SCE_background.png` (SCE-UX-BG-01R2). */
export const SCE_APPROVED_AUTHENTICATED_APP_BACKGROUND_SHA256 =
  "583698dfdf8562c192ef1f1b8319c3681e888d13d049ee2ac6c96d7cbf76eb09";

/** CSS `background-image` value for shell tokens (cache-busted). */
export const SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE = `url("${SCE_AUTHENTICATED_APP_BACKGROUND_URL}")`;

/** Root wrapper class applied only on the authenticated admin application shell. */
export const SCE_AUTHENTICATED_APP_SHELL_CLASS = "sce-authenticated-app-shell";
