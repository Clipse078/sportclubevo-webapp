/**
 * Canonical kiosk shell presentation tokens shared by Infoboard Screen 1 and Screen 2.
 * Presentation only — never affects feed content or pagination.
 */

import { resolveLightInlineWelcome } from "@/lib/infoboard/light-header-welcome";
import { isVenueDisplayLightTheme } from "@/lib/infoboard/venue-display-grid";
import type { VenueHeaderBrandingInput } from "@/lib/infoboard/venue-header-presentation";
import type { InfoboardDisplayTheme } from "@/lib/publishing/infoboard/display-theme";

export type KioskShellBrandingInput = {
  readonly tenantPrimaryColor?: string | null;
  readonly tenantSecondaryColor?: string | null;
};

/** Approved venue ambient header layer on all Infoboard screens. */
export const KIOSK_SHELL_HEADER_AMBIENT = {
  venueHeaderAmbient: true,
} as const;

/** Approved jumbotron ambient footer layer on all Infoboard screens. */
export const KIOSK_SHELL_FOOTER_AMBIENT = {
  jumbotronAmbient: true,
} as const;

export type KioskShellThemePresentation = {
  readonly shellTheme: "dark" | "light";
  readonly venueDisplayLight: boolean;
  readonly subtitlePlacement: "band" | "header-inline";
};

export function resolveKioskShellThemePresentation(
  theme: InfoboardDisplayTheme,
): KioskShellThemePresentation {
  const venueDisplayLight = isVenueDisplayLightTheme(theme);
  return {
    shellTheme: venueDisplayLight ? "light" : "dark",
    venueDisplayLight,
    subtitlePlacement: venueDisplayLight ? "header-inline" : "band",
  };
}

export function resolveVenueHeaderBrandingInput(
  branding?: KioskShellBrandingInput | null,
): VenueHeaderBrandingInput {
  return {
    tenantPrimaryColor: branding?.tenantPrimaryColor ?? null,
    tenantSecondaryColor: branding?.tenantSecondaryColor ?? null,
  };
}

export function resolveKioskHeaderWelcomeSubtitle(
  subtitleText: string | null,
  theme: InfoboardDisplayTheme,
): string | null {
  if (subtitleText == null) {
    return null;
  }
  return isVenueDisplayLightTheme(theme)
    ? resolveLightInlineWelcome(subtitleText)
    : subtitleText.toUpperCase();
}

/** Tenant name typography contract (header club identity). */
export const KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY = {
  fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
  fontStyle: "italic" as const,
  fontWeight: 800 as const,
};
