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

/** Shared top-alignment class for ACTIVITY / KABINE / PLATZ (and TIME) content columns. */
export const VENUE_ACTIVITY_CONTENT_TOP_CLASS = "venueActivityContentTop";

/** Canonical padding-top anchor shared by TIME / ACTIVITY / KABINE / PLATZ (R8). */
export const VENUE_ACTIVITY_CONTENT_TOP_VAR = "--ib-activity-content-top";

/** LIGHT TIME column activity-type surface tokens (only coloured zone in R8). */
export const VENUE_LIGHT_TIME_SURFACE_VARS = {
  match: "--ib-zone-surface-time-match",
  training: "--ib-zone-surface-time-training",
  tournament: "--ib-zone-surface-time-tournament",
  other: "--ib-zone-surface-time-other",
} as const;

/** Semantic marker for central match VS presentation (R8). */
export const VENUE_MATCH_VERSUS_ATTR = "data-match-versus";

/** CSS module class for R8 VS typography (paired with vsLabel). */
export const VENUE_MATCH_VERSUS_DISPLAY_CLASS = "matchVersusLabel";

/** Symmetric vertical team blocks (crest → name → category) with central VS. */
export const VENUE_MATCH_LAYOUT_ATTR = "data-venue-match-layout";
export const VENUE_MATCH_LAYOUT_SYMMETRIC = "symmetric-block";

/** @deprecated R3 horizontal name–crest row — replaced by VENUE_MATCH_LAYOUT_SYMMETRIC (R4). */
export const VENUE_MATCH_LAYOUT_HORIZONTAL = "horizontal";

/** ACTIVITY column vertical zones: event context header vs primary presentation. */
export const VENUE_ACTIVITY_ZONE_ATTR = "data-venue-activity-zone";
export const VENUE_ACTIVITY_ZONE_CONTEXT = "context";
export const VENUE_ACTIVITY_ZONE_PRIMARY = "primary";

/** Primary vs secondary team identity typography markers (website grammar). */
export const VENUE_TEAM_TYPOGRAPHY_ATTR = "data-venue-team-typography";
export const VENUE_TEAM_TYPOGRAPHY_PRIMARY = "primary";
export const VENUE_TEAM_TYPOGRAPHY_SECONDARY = "secondary";

/** Light-theme venue display uses compact header + optional page heading. */
export function isVenueDisplayLightTheme(
  theme: "DARK" | "LIGHT" | "dark" | "light",
): boolean {
  return theme.toString().toUpperCase() === "LIGHT";
}
