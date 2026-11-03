/**
 * SCE Infoboard V2 R11R1 — canonical semantic label grammar (MATCH … PLATZ).
 * Presentation-only; grid geometry unchanged.
 */

export const VENUE_SEMANTIC_LABELS = [
  "MATCH",
  "TRAINING",
  "TURNIER",
  "KABINE",
  "PLATZ",
] as const;

export type VenueSemanticLabelKind = (typeof VENUE_SEMANTIC_LABELS)[number];

/** DOM marker shared by activity + destination semantic badges. */
export const VENUE_SEMANTIC_LABEL_ATTR = "data-semantic-label" as const;

/** CSS module class — must match InfoboardScreen1.module.css `.venueSemanticLabel`. */
export const VENUE_SEMANTIC_LABEL_CLASS = "venueSemanticLabel" as const;

/** Legacy alias — activity badges reuse the same surface rules. */
export const VENUE_ACTIVITY_TYPE_LABEL_CLASS = "eventTypeLabel" as const;

export const VENUE_SEMANTIC_LABEL_FONT_VAR = "--ib-semantic-label-font-size" as const;

/** Viewport-scaled size token — must not use cqw/cqi (PLATZ column is a nested size container). */
export const VENUE_SEMANTIC_LABEL_FONT_SIZE_BASE =
  "clamp(0.82rem, 1.08vw, 1.32rem)" as const;

/** Canonical heading typography shared by MATCH, TRAINING, TURNIER, KABINE and PLATZ badges. */
export const VENUE_SEMANTIC_LABEL_TYPOGRAPHY = {
  fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
  fontSize: `var(${VENUE_SEMANTIC_LABEL_FONT_VAR})`,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  lineHeight: 1,
} as const;

export const VENUE_SEMANTIC_LABEL_GAP_VAR = "--ib-venue-label-primary-gap" as const;

/** Semantic colours (LIGHT) — label badge only, not column surfaces. */
export const VENUE_SEMANTIC_LABEL_COLORS = {
  MATCH: "#D83033",
  TRAINING: "#1E5BC6",
  TURNIER: "#E87C24",
  KABINE: "#1849A6",
  PLATZ: "#174D38",
} as const satisfies Record<VenueSemanticLabelKind, string>;

/** Maps publishing event types to semantic label kinds (display strings may differ). */
export function venueSemanticLabelKindForEventType(
  type: "MATCH" | "TRAINING" | "TOURNAMENT" | string,
): VenueSemanticLabelKind | null {
  switch (type) {
    case "MATCH":
      return "MATCH";
    case "TRAINING":
      return "TRAINING";
    case "TOURNAMENT":
      return "TURNIER";
    default:
      return null;
  }
}
