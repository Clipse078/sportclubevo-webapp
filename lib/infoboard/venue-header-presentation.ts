/**
 * Tenant-aware venue header presentation tokens for Infoboard Screen 1.
 * Maps raw tenant brand colours into safe header surface tokens.
 */

import {
  PLATFORM_BRANDING,
  resolveTenantBranding,
} from "@/lib/tenant-runtime/branding";

export type VenueHeaderBrandingInput = {
  readonly tenantPrimaryColor?: string | null;
  readonly tenantSecondaryColor?: string | null;
};

export type VenueHeaderPresentationTokens = {
  readonly tenantPrimary: string;
  readonly tenantSecondary: string | null;
  readonly accentGradient: string;
};

export function resolveVenueHeaderPresentationTokens(
  branding?: VenueHeaderBrandingInput | null,
): VenueHeaderPresentationTokens {
  const resolved = resolveTenantBranding({
    logoUrl: null,
    primaryColor: branding?.tenantPrimaryColor ?? null,
    secondaryColor: branding?.tenantSecondaryColor ?? null,
  });

  const tenantPrimary = resolved.primaryColor;
  const tenantSecondary =
    branding?.tenantSecondaryColor != null &&
    branding.tenantSecondaryColor.trim().length > 0
      ? resolved.secondaryColor
      : null;

  const accentGradient =
    tenantSecondary != null
      ? `linear-gradient(90deg, ${tenantPrimary} 0%, ${tenantSecondary} 100%)`
      : tenantPrimary;

  return {
    tenantPrimary,
    tenantSecondary,
    accentGradient,
  };
}

export function resolveVenueHeaderCssVars(
  branding?: VenueHeaderBrandingInput | null,
): Record<string, string> {
  const tokens = resolveVenueHeaderPresentationTokens(branding);
  return {
    "--venue-tenant-primary": tokens.tenantPrimary,
    "--venue-tenant-secondary": tokens.tenantSecondary ?? tokens.tenantPrimary,
    "--venue-header-accent-primary": tokens.tenantPrimary,
    "--venue-header-accent-secondary":
      tokens.tenantSecondary ?? tokens.tenantPrimary,
    "--venue-header-accent-gradient": tokens.accentGradient,
    "--venue-header-surface": "#FFFFFF",
    "--venue-header-text": "#0B1F3A",
    "--venue-header-muted": "rgba(11, 31, 58, 0.62)",
    "--venue-header-divider": "rgba(11, 31, 58, 0.12)",
  };
}

/** Platform defaults when no tenant override is supplied. */
export const VENUE_HEADER_PLATFORM_PRIMARY = PLATFORM_BRANDING.primaryColor;
