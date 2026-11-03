/**
 * R14/R16 — operational ambient depth tokens (light venue theme).
 * Raster opacity on the decorative shell only; base atmosphere is a fallback under full-cover artwork.
 */

/** Corrected MATCH pitch geometry ships in a separate asset package (not R15 CSS). */
export const KNOWN_ASSET_ISSUE_MATCH_PITCH_GEOMETRY = "YES" as const;

export const AMBIENT_IMAGE_OPACITY_CSS_VAR = "--ambient-image-opacity" as const;

export const AMBIENT_BASE_ATMOSPHERE_CSS_VAR = "--ambient-base-atmosphere" as const;

export const AMBIENT_DARK_UNIFIED_POSITION_X = "50%" as const;
export const AMBIENT_DARK_UNIFIED_POSITION_Y = "50%" as const;

/** R16 — explicit background vs foreground stacking inside the operational environment. */
export const VENUE_OPERATIONAL_AMBIENT_STACK_Z_INDEX = {
  baseAtmosphere: 0,
  raster: 1,
  scrims: 2,
  foreground: 10,
} as const;

export const VENUE_OPERATIONAL_AMBIENT_STACK_Z_INDEX_CSS_VARS = {
  baseAtmosphere: "--venue-ambient-z-base",
  raster: "--venue-ambient-z-raster",
  scrims: "--venue-ambient-z-scrims",
  foreground: "--venue-ambient-z-foreground",
} as const;

/** Operational Kabine foreground must never participate in ambient opacity. */
export const KABINE_FOREGROUND_OPACITY = 1 as const;

/** Light-theme activity raster opacity — artwork discovered, not read. */
export const VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT = {
  MATCH: 0.42,
  TOURNAMENT: 0.38,
  TRAINING: 0.34,
} as const;

/** R22 — unified DARK operational backdrop raster opacity (decorative shell only). */
export const VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_DARK = 0.65 as const;

/** R22 — navy base under the unified DARK operational artwork. */
export const VENUE_ACTIVITY_AMBIENT_DARK_BASE_ATMOSPHERE = "#0A1828" as const;

/** R22R1 — translucent internal column guides on the unified DARK operational card. */
export const VENUE_OPERATIONAL_UNIFIED_DIVIDER_DARK = "rgba(99, 135, 175, 0.06)" as const;

/** R22R1 — restrained blue-toned row outline on DARK operational activity cards. */
export const VENUE_OPERATIONAL_CARD_OUTLINE_DARK = "rgba(99, 135, 175, 0.24)" as const;

/** R22R1 — secondary label contrast on unified DARK operational cards (not pure white). */
export const VENUE_OPERATIONAL_TEXT_MUTED_DARK = "#92A8BE" as const;
export const VENUE_OPERATIONAL_TEXT_DIM_DARK = "#7A93AB" as const;
export const VENUE_OPERATIONAL_MATCH_ROLE_DARK = "#9DB4CA" as const;

export type VenueActivityAmbientImageOpacityLight =
  (typeof VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT)[keyof typeof VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT];
