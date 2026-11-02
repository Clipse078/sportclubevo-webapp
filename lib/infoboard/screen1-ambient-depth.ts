/**
 * R14 — operational ambient depth tokens (light venue theme).
 * Raster opacity + full-height base atmosphere behind width-driven artwork.
 */

export const AMBIENT_IMAGE_OPACITY_CSS_VAR = "--ambient-image-opacity" as const;

export const AMBIENT_BASE_ATMOSPHERE_CSS_VAR = "--ambient-base-atmosphere" as const;

/** Light-theme activity raster opacity — artwork discovered, not read. */
export const VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT = {
  MATCH: 0.68,
  TOURNAMENT: 0.64,
  TRAINING: 0.62,
} as const;

export type VenueActivityAmbientImageOpacityLight =
  (typeof VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT)[keyof typeof VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT];
