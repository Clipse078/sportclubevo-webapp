import { SCE_DS2_WHITE_EDITION } from "@/lib/design-system/sce-foundation-contract";

const SHELL_SELECTOR = ".sce-authenticated-app-shell";

/**
 * Portalled modals are outside the authenticated shell — inherit DS 2.0 theme hook when present.
 */
export function resolveSceModalOverlayThemeAttribute(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const shell = document.querySelector(SHELL_SELECTOR);
  const theme = shell?.getAttribute(SCE_DS2_WHITE_EDITION.themeDataAttribute)?.trim();
  if (!theme) {
    return null;
  }
  return theme;
}
