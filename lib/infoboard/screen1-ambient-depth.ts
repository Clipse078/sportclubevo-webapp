/**
 * R14/R15 — operational ambient depth tokens (light venue theme).
 * Raster opacity + full-height base atmosphere behind bounded ambient artwork.
 */

/** Corrected MATCH pitch geometry ships in a separate asset package (not R15 CSS). */
export const KNOWN_ASSET_ISSUE_MATCH_PITCH_GEOMETRY = "YES" as const;

export const AMBIENT_IMAGE_OPACITY_CSS_VAR = "--ambient-image-opacity" as const;

export const AMBIENT_BASE_ATMOSPHERE_CSS_VAR = "--ambient-base-atmosphere" as const;

/** Light-theme activity raster opacity — artwork discovered, not read. */
export const VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT = {
  MATCH: 0.42,
  TOURNAMENT: 0.38,
  TRAINING: 0.34,
} as const;

export type VenueActivityAmbientImageOpacityLight =
  (typeof VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT)[keyof typeof VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT];
