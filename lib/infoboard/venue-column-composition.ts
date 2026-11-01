/**
 * SCE Infoboard V2 R11R1 — label + primary content as one vertically centred group.
 */

/** Outer column shell — centres the composition block in the card zone. */
export const VENUE_COLUMN_SHELL_CLASS = "venueColumnShell" as const;

/** Label ↓ gap ↓ primary — single information group. */
export const VENUE_COLUMN_COMPOSITION_CLASS = "venueColumnComposition" as const;

export const VENUE_COLUMN_CONTEXT_CLASS = "venueColumnContext" as const;

export const VENUE_COLUMN_PRIMARY_CLASS = "venueColumnPrimary" as const;

/** Controlled gap between semantic label and primary block (CSS token). */
export const VENUE_LABEL_PRIMARY_GAP_VAR = "--ib-venue-label-primary-gap" as const;

/** DOM marker for composition contract tests (CSS module class names are hashed). */
export const VENUE_COLUMN_COMPOSITION_ATTR = "data-venue-column-composition" as const;
export const VENUE_COLUMN_COMPOSITION_MARKER = "true" as const;
