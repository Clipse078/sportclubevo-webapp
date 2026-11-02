/**
 * R14/R16 — operational ambient depth tokens (light venue theme).
 * Raster opacity on the decorative shell only; base atmosphere is a fallback under full-cover artwork.
 */

/** Corrected MATCH pitch geometry ships in a separate asset package (not R15 CSS). */
export const KNOWN_ASSET_ISSUE_MATCH_PITCH_GEOMETRY = "YES" as const;

export const AMBIENT_IMAGE_OPACITY_CSS_VAR = "--ambient-image-opacity" as const;

export const AMBIENT_BASE_ATMOSPHERE_CSS_VAR = "--ambient-base-atmosphere" as const;

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

/** Light-theme activity raster opacity — artwork discovered, not read. */
export const VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT = {
  MATCH: 0.42,
  TOURNAMENT: 0.38,
  TRAINING: 0.34,
} as const;

export type VenueActivityAmbientImageOpacityLight =
  (typeof VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT)[keyof typeof VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT];
