import { SCE_DS2_WHITE_EDITION } from "@/lib/design-system/sce-foundation-contract";

/**
 * Canonical authenticated-navigation wordmarks (public assets).
 *
 * `sportclubevo_logo.png` — dark lettering for light surfaces (White Edition chrome).
 * `sportclubevo_logo_alt.png` — light lettering for the default dark authenticated chrome.
 *
 * Invoice PDF embeds reuse the alt asset as a header mark on the printed slip layout;
 * do not conflate that path with authenticated shell theme selection.
 */
export const SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_PUBLIC_PATH =
  "public/images/branding/sportclubevo_logo.png" as const;

export const SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_PUBLIC_PATH =
  "public/images/branding/sportclubevo_logo_alt.png" as const;

export const SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC =
  "/images/branding/sportclubevo_logo.png" as const;

export const SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC =
  "/images/branding/sportclubevo_logo_alt.png" as const;

/** Native width ÷ height for layout hints (unchanged artwork proportions). */
export const SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_ASPECT = 937 / 204;

export const SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_ASPECT = 864 / 174;

export type SportClubEvoPlatformWordmarkSurface = "light" | "dark";

export type SportClubEvoPlatformWordmarkVariant = {
  src: string;
  aspect: number;
  surface: SportClubEvoPlatformWordmarkSurface;
};

const WORDMARK_BY_SURFACE: Record<
  SportClubEvoPlatformWordmarkSurface,
  SportClubEvoPlatformWordmarkVariant
> = {
  light: {
    src: SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC,
    aspect: SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_ASPECT,
    surface: "light",
  },
  dark: {
    src: SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC,
    aspect: SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_ASPECT,
    surface: "dark",
  },
};

/** Maps DS2 White Edition runtime theme to the wordmark suited for the active chrome. */
export function resolveSportClubEvoPlatformWordmarkForTheme(
  theme: string | null | undefined,
): SportClubEvoPlatformWordmarkVariant {
  if (theme === SCE_DS2_WHITE_EDITION.themeValue) {
    return WORDMARK_BY_SURFACE.light;
  }
  return WORDMARK_BY_SURFACE.dark;
}

export function resolveSportClubEvoPlatformWordmarkForSurface(
  surface: SportClubEvoPlatformWordmarkSurface,
): SportClubEvoPlatformWordmarkVariant {
  return WORDMARK_BY_SURFACE[surface];
}
