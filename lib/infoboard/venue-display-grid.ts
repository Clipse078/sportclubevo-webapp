/**
 * lib/infoboard/venue-display-grid.ts
 *
 * SCE Infoboard V2 — canonical four-column venue activity grid contract.
 * Presentation-only: shared geometry for MATCH, TRAINING, and TOURNAMENT cards.
 */

/** CSS grid-template-columns value — must match InfoboardScreen1.module.css tokens. */
export const VENUE_ACTIVITY_GRID_TEMPLATE_COLUMNS =
  "var(--ib-zone-time) var(--ib-zone-event) var(--ib-zone-room) var(--ib-zone-pitch)" as const;

export const VENUE_ACTIVITY_GRID_ZONE_WIDTHS = {
  time: "var(--ib-zone-time)",
  activity: "var(--ib-zone-event)",
  kabine: "var(--ib-zone-room)",
  platz: "var(--ib-zone-pitch)",
} as const;

export const VENUE_ACTIVITY_CARD_TEST_ID = "venue-activity-card";

/** Stable column markers for grid-contract tests (legacy test ids may differ per card). */
export const VENUE_ACTIVITY_COLUMN_MARKERS = {
  time: "time",
  identity: "activity",
  kabine: "kabine",
  platz: "platz",
} as const;

export const VENUE_ACTIVITY_COLUMN_ATTR = "data-venue-column";

/** @deprecated Prefer querying [data-venue-column] — kept for transitional tests. */
export const VENUE_ACTIVITY_COLUMN_TEST_IDS = {
  time: "venue-activity-time",
  identity: "venue-activity-identity",
  kabine: "venue-activity-kabine",
  platz: "venue-activity-platz",
} as const;

export const VENUE_ACTIVITY_GRID_DATA_ATTR = "data-venue-activity-grid";

/** Light-theme venue display uses compact header + optional page heading. */
export function isVenueDisplayLightTheme(
  theme: "DARK" | "LIGHT" | "dark" | "light",
): boolean {
  return theme.toString().toUpperCase() === "LIGHT";
}
