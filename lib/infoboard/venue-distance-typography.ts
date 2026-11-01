/**
 * SCE Infoboard V2 — R9 canonical distance typography (55" venue signage).
 *
 * Tokens scale via venue presentation density; grid geometry is unchanged.
 */

import type { VenuePresentationDensity } from "@/lib/infoboard/venue-presentation-density";
import { scaleVenuePresentationClamp } from "@/lib/infoboard/venue-presentation-density";

/** R8 container-query baseline (pre-R9) — regression comparison only. */
export const R8_VENUE_TIME_PRIMARY_BASELINE = "clamp(2rem, 2.8cqw, 3.6rem)" as const;

export const R8_VENUE_TIME_SECONDARY_BASELINE = "clamp(0.85rem, 1.1cqw, 1.35rem)" as const;

export const R8_VENUE_VS_LABEL_BASELINE = "clamp(1.65rem, 2.15cqw, 2.125rem)" as const;

/** R9 primary start-time clamps keyed by activities on the current page. */
export const VENUE_DISTANCE_TIME_PRIMARY_BY_COUNT = {
  1: "clamp(3.4rem, 4.5cqw, 4.5rem)",
  2: "clamp(3.15rem, 4.15cqw, 4.35rem)",
  3: "clamp(2.85rem, 3.75cqw, 4rem)",
  4: "clamp(2.35rem, 3.05cqw, 3.5rem)",
  5: "clamp(2.1rem, 2.75cqw, 3.15rem)",
  6: "clamp(1.95rem, 2.55cqw, 2.95rem)",
} as const;

/** R9 secondary end-time clamps (~35–45% of primary visual weight). */
export const VENUE_DISTANCE_TIME_SECONDARY_BY_COUNT = {
  1: "clamp(1.35rem, 1.65cqw, 1.65rem)",
  2: "clamp(1.3rem, 1.58cqw, 1.6rem)",
  3: "clamp(1.2rem, 1.45cqw, 1.55rem)",
  4: "clamp(1.1rem, 1.35cqw, 1.45rem)",
  5: "clamp(1.05rem, 1.28cqw, 1.38rem)",
  6: "clamp(1rem, 1.22cqw, 1.32rem)",
} as const;

/** ~25% above R8 VS token — still subordinate to club blocks and crests. */
export const VENUE_DISTANCE_VS_LABEL = "clamp(2.05rem, 2.68cqw, 2.65rem)" as const;

export const VENUE_DISTANCE_DEST_TEAM_BASE = "clamp(0.92rem, 1.15cqw, 1.35rem)" as const;

export const VENUE_DISTANCE_MATCH_SECONDARY_BASE = "clamp(0.95rem, 1.22cqw, 1.42rem)" as const;

export const VENUE_DISTANCE_KABINE_TEAM_BASE = "clamp(0.9rem, 1.12cqw, 1.28rem)" as const;

/** Modest crest boost on spacious 1–2 activity pages when containment allows. */
export const VENUE_DISTANCE_SPACIOUS_MATCH_LOGO_SCALE = 1.08 as const;

export const MICRO_TEXT_AUDIT = {
  PRIMARY_MIN_FONT: VENUE_DISTANCE_DEST_TEAM_BASE,
  SECONDARY_MIN_FONT: VENUE_DISTANCE_KABINE_TEAM_BASE,
  REMAINING_MICRO_TEXT: [
    "--ib-fs-powered-by (footer brand attribution)",
    ".destLabel (KABINE / PLATZ semantic headings)",
    ".matchAllocRole (HEIM / GAST operational labels)",
    ".eventTypeLabel competition line when present",
  ],
  RATIONALE:
    "R9 raises distance-readable A-tier tokens (start time, club identity, pitch, room numbers) " +
    "and important B-tier Kabine team lines while leaving C-tier footer and semantic micro-labels unchanged.",
} as const;

export function resolveVenueDistanceActivityCount(count: number): keyof typeof VENUE_DISTANCE_TIME_PRIMARY_BY_COUNT {
  if (count <= 1) return 1;
  if (count >= 6) return 6;
  return count as keyof typeof VENUE_DISTANCE_TIME_PRIMARY_BY_COUNT;
}

export function resolveVenueDistanceTimePrimary(count: number): string {
  return VENUE_DISTANCE_TIME_PRIMARY_BY_COUNT[resolveVenueDistanceActivityCount(count)];
}

export function resolveVenueDistanceTimeSecondary(count: number): string {
  return VENUE_DISTANCE_TIME_SECONDARY_BY_COUNT[resolveVenueDistanceActivityCount(count)];
}

export function scaleVenueDistanceMatchLogoSize(
  logoClamp: string,
  density: VenuePresentationDensity,
): string {
  const scaled = scaleVenuePresentationClamp(logoClamp, density);
  if (density !== "spacious") return scaled;
  return scaled.replace(
    /([\d.]+)(rem|cqw|vw|vh|cqh|px)/g,
    (_, raw, unit) => {
      const value = Number.parseFloat(raw) * VENUE_DISTANCE_SPACIOUS_MATCH_LOGO_SCALE;
      const rounded =
        unit === "px"
          ? String(Math.round(value))
          : value.toFixed(3).replace(/\.?0+$/, "");
      return `${rounded}${unit}`;
    },
  );
}

export function resolveVenueDistanceEventListCssVars(
  density: VenuePresentationDensity,
  activityCount: number,
): Record<string, string> {
  const primary = scaleVenuePresentationClamp(
    resolveVenueDistanceTimePrimary(activityCount),
    density,
  );
  const secondary = scaleVenuePresentationClamp(
    resolveVenueDistanceTimeSecondary(activityCount),
    density,
  );
  return {
    "--ib-fs-event-time": primary,
    "--ib-fs-event-end-time": secondary,
    "--ib-fs-vs-label": scaleVenuePresentationClamp(VENUE_DISTANCE_VS_LABEL, density),
    "--ib-fs-dest-team": scaleVenuePresentationClamp(
      VENUE_DISTANCE_DEST_TEAM_BASE,
      density,
    ),
    "--ib-match-secondary-font-size": scaleVenuePresentationClamp(
      VENUE_DISTANCE_MATCH_SECONDARY_BASE,
      density,
    ),
    "--ib-kabine-team-font-size": scaleVenuePresentationClamp(
      VENUE_DISTANCE_KABINE_TEAM_BASE,
      density,
    ),
  };
}

/** Extract the minimum rem value from a clamp() token for structural regression tests. */
export function parseClampMinRem(clampCss: string): number {
  const match = clampCss.match(/clamp\(\s*([\d.]+)rem/i);
  if (!match) return 0;
  return Number.parseFloat(match[1] ?? "0");
}

export function r9TimePrimaryExceedsR8Baseline(count: number): boolean {
  return (
    parseClampMinRem(resolveVenueDistanceTimePrimary(count)) >
    parseClampMinRem(R8_VENUE_TIME_PRIMARY_BASELINE)
  );
}

export function r9VsLabelExceedsR8Baseline(): boolean {
  return (
    parseClampMinRem(VENUE_DISTANCE_VS_LABEL) >
    parseClampMinRem(R8_VENUE_VS_LABEL_BASELINE)
  );
}
