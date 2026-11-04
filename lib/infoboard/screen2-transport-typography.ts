/**
 * SCE-INFOBOARD-R23R3 — Screen 2 ÖV typography harmonized with Screen 1 Barlow Condensed identity.
 * Presentation only — layout and transport data unchanged.
 */

import { KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY } from "@/lib/infoboard/kiosk-shell-presentation";
import { VENUE_SEMANTIC_LABEL_TYPOGRAPHY } from "@/lib/infoboard/venue-semantic-label";

/** Shared display face — same token chain as Screen 1 section labels and team names. */
export const SCREEN2_TRANSPORT_DISPLAY_FONT = KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY.fontFamily;

/** Upright operational copy (stop name, platform hints). */
export const SCREEN2_TRANSPORT_BODY_FONT = 'var(--font-body)' as const;

/** ÖV-ABFAHRTEN eyebrow — condensed display, extra-bold, upright. */
export const SCREEN2_TRANSPORT_EYEBROW_TYPOGRAPHY = {
  fontFamily: SCREEN2_TRANSPORT_DISPLAY_FONT,
  fontWeight: 800,
  fontStyle: "normal" as const,
  fontSize: "clamp(18px, 1.35vw, 24px)",
  letterSpacing: "0.12em",
} as const;

/** Tenant stop name under the ÖV heading — body face, upright. */
export const SCREEN2_TRANSPORT_STATION_TYPOGRAPHY = {
  fontFamily: SCREEN2_TRANSPORT_BODY_FONT,
  fontWeight: 700,
  fontStyle: "normal" as const,
  fontSize: "clamp(24px, 1.85vw, 34px)",
  letterSpacing: "0.01em",
} as const;

/** ~28% larger perceived size vs R23R2 direction labels. */
export const SCREEN2_TRANSPORT_DIRECTION_LABEL_FONT_SIZE = "clamp(23px, 1.6vw, 33px)" as const;

export const SCREEN2_TRANSPORT_DIRECTION_LABEL_TYPOGRAPHY = {
  fontFamily: SCREEN2_TRANSPORT_DISPLAY_FONT,
  fontWeight: 700,
  fontStyle: "normal" as const,
  fontSize: SCREEN2_TRANSPORT_DIRECTION_LABEL_FONT_SIZE,
  letterSpacing: VENUE_SEMANTIC_LABEL_TYPOGRAPHY.letterSpacing,
} as const;

/** ~12% larger perceived size vs R23R2 destination line. */
export const SCREEN2_TRANSPORT_DESTINATION_FONT_SIZE = "clamp(27px, 1.86vw, 38px)" as const;

export const SCREEN2_TRANSPORT_DESTINATION_TYPOGRAPHY = {
  fontFamily: SCREEN2_TRANSPORT_DISPLAY_FONT,
  fontWeight: 700,
  fontStyle: "normal" as const,
  fontSize: SCREEN2_TRANSPORT_DESTINATION_FONT_SIZE,
  letterSpacing: "0.02em",
} as const;

/** ~10% larger route badge vs R23R2. */
export const SCREEN2_TRANSPORT_LINE_BADGE_FONT_SIZE = "clamp(29px, 2.04vw, 40px)" as const;
export const SCREEN2_TRANSPORT_LINE_BADGE_MIN_WIDTH = "clamp(57px, 3.85vw, 75px)" as const;
export const SCREEN2_TRANSPORT_LINE_BADGE_HEIGHT = "clamp(48px, 3.3vw, 64px)" as const;

export const SCREEN2_TRANSPORT_LINE_BADGE_TYPOGRAPHY = {
  fontFamily: SCREEN2_TRANSPORT_DISPLAY_FONT,
  fontWeight: 800,
  fontStyle: "normal" as const,
  fontSize: SCREEN2_TRANSPORT_LINE_BADGE_FONT_SIZE,
  letterSpacing: "0.01em",
} as const;

/** Countdown numerals — align with Screen 1 header time (tabular, bold display). */
export const SCREEN2_TRANSPORT_COUNTDOWN_FONT_SIZE = "clamp(32px, 2.35vw, 48px)" as const;

export const SCREEN2_TRANSPORT_COUNTDOWN_TYPOGRAPHY = {
  fontFamily: SCREEN2_TRANSPORT_DISPLAY_FONT,
  fontWeight: 800,
  fontStyle: "normal" as const,
  fontSize: SCREEN2_TRANSPORT_COUNTDOWN_FONT_SIZE,
  fontVariantNumeric: "tabular-nums" as const,
} as const;

export const SCREEN2_TRANSPORT_ABSOLUTE_TIME_TYPOGRAPHY = {
  fontFamily: SCREEN2_TRANSPORT_DISPLAY_FONT,
  fontWeight: 700,
  fontStyle: "normal" as const,
  fontVariantNumeric: "tabular-nums" as const,
} as const;
