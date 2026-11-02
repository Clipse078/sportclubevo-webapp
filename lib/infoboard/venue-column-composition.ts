/**
 * SCE Infoboard V2 R11R2 — semantic header at column top; primary content centred in body.
 */

/** Outer column shell — full-height column; composition fills remaining space. */
export const VENUE_COLUMN_SHELL_CLASS = "venueColumnShell" as const;

/** Column layout: header (top) + body (flex, centres primary block). */
export const VENUE_COLUMN_COMPOSITION_CLASS = "venueColumnComposition" as const;

export const VENUE_COLUMN_HEADER_CLASS = "venueColumnHeader" as const;

export const VENUE_COLUMN_BODY_CLASS = "venueColumnBody" as const;

export const VENUE_COLUMN_CONTEXT_CLASS = "venueColumnContext" as const;

export const VENUE_COLUMN_PRIMARY_CLASS = "venueColumnPrimary" as const;

/** Controlled gap between semantic label and context lines inside the header stack. */
export const VENUE_LABEL_PRIMARY_GAP_VAR = "--ib-venue-label-primary-gap" as const;

/** DOM markers for composition contract tests (CSS module class names are hashed). */
export const VENUE_COLUMN_COMPOSITION_ATTR = "data-venue-column-composition" as const;
export const VENUE_COLUMN_COMPOSITION_MARKER = "true" as const;

export const VENUE_COLUMN_HEADER_ATTR = "data-venue-column-header" as const;
export const VENUE_COLUMN_HEADER_MARKER = "true" as const;

export const VENUE_COLUMN_BODY_ATTR = "data-venue-column-body" as const;
export const VENUE_COLUMN_BODY_MARKER = "true" as const;

/** R11R2 structural contract — semantic badges anchor to the column top. */
export const SEMANTIC_HEADERS_TOP_ALIGNED = true as const;

/** R11R3 — TIME column uses the same header/body split as operational columns. */
export const TIME_COLUMN_COMPOSITION_ATTR = "data-time-column-composition" as const;
export const TIME_COLUMN_COMPOSITION_MARKER = "true" as const;

export const TIME_COLUMN_HEADER_ATTR = "data-time-column-header" as const;
export const TIME_COLUMN_HEADER_MARKER = "true" as const;

export const TIME_COLUMN_BODY_ATTR = "data-time-column-body" as const;
export const TIME_COLUMN_BODY_MARKER = "true" as const;
