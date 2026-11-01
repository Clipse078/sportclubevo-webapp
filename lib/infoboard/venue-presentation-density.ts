/**
 * SCE Infoboard V2 — page presentation density (R5).
 *
 * Density reflects how many activities appear on the current page only.
 * It scales presentation tokens (typography, crests, spacing) — never grid
 * geometry, pagination, ordering, or feed semantics.
 */

export const VENUE_PRESENTATION_DENSITY_ATTR = "data-venue-density";

export const VENUE_PRESENTATION_DENSITIES = ["spacious", "standard"] as const;

export type VenuePresentationDensity = (typeof VENUE_PRESENTATION_DENSITIES)[number];

/** Relative to R4 baseline clamp tokens in screen1-logo-settings / module CSS. */
export const VENUE_PRESENTATION_DENSITY_STANDARD_SCALE = 1.16;

export const VENUE_PRESENTATION_DENSITY_SPACIOUS_SCALE = 1.38;

export function resolveVenuePresentationDensity(
  activityCount: number,
): VenuePresentationDensity {
  if (activityCount <= 2) return "spacious";
  return "standard";
}

export function venuePresentationDensityScale(
  density: VenuePresentationDensity,
): number {
  return density === "spacious"
    ? VENUE_PRESENTATION_DENSITY_SPACIOUS_SCALE
    : VENUE_PRESENTATION_DENSITY_STANDARD_SCALE;
}

/** Scales numeric units inside CSS clamp/min/max expressions (rem, vw, cqw, …). */
export function scaleVenuePresentationClamp(
  clampCss: string,
  density: VenuePresentationDensity,
): string {
  const factor = venuePresentationDensityScale(density);
  if (factor === 1) return clampCss;
  return clampCss.replace(
    /([\d.]+)(rem|cqw|vw|vh|cqh|px)/g,
    (_, raw, unit) => {
      const scaled = Number.parseFloat(raw) * factor;
      const rounded =
        unit === "px" ? String(Math.round(scaled)) : scaled.toFixed(3).replace(/\.?0+$/, "");
      return `${rounded}${unit}`;
    },
  );
}

/** Event-list scoped tokens (not overridden per card). */
const VENUE_DENSITY_LIST_TOKEN_BASE = {
  activityType: "clamp(0.82rem, 1.08cqw, 1.32rem)",
  matchSecondary: "clamp(0.78rem, 1cqw, 1.15rem)",
  tournamentParticipant: "clamp(0.78rem, 1.02cqw, 1.18rem)",
  destRoom: "clamp(1.15rem, 1.55cqw, 2.05rem)",
  destPitch: "clamp(1.65rem, 2.35cqw, 3.05rem)",
  statusLabel: "clamp(0.88rem, 1.12cqw, 1.38rem)",
  eventEndTime: "clamp(0.92rem, 1.18cqw, 1.48rem)",
} as const;

export function resolveVenueDensityEventListCssVars(
  density: VenuePresentationDensity,
): Record<string, string> {
  return {
    "--ib-fs-activity-type": scaleVenuePresentationClamp(
      VENUE_DENSITY_LIST_TOKEN_BASE.activityType,
      density,
    ),
    "--ib-match-secondary-font-size": scaleVenuePresentationClamp(
      VENUE_DENSITY_LIST_TOKEN_BASE.matchSecondary,
      density,
    ),
    "--ib-tournament-participant-font-size": scaleVenuePresentationClamp(
      VENUE_DENSITY_LIST_TOKEN_BASE.tournamentParticipant,
      density,
    ),
    "--ib-fs-dest-room": scaleVenuePresentationClamp(
      VENUE_DENSITY_LIST_TOKEN_BASE.destRoom,
      density,
    ),
    "--ib-fs-dest-pitch": scaleVenuePresentationClamp(
      VENUE_DENSITY_LIST_TOKEN_BASE.destPitch,
      density,
    ),
    "--ib-fs-status-label": scaleVenuePresentationClamp(
      VENUE_DENSITY_LIST_TOKEN_BASE.statusLabel,
      density,
    ),
    "--ib-fs-event-end-time": scaleVenuePresentationClamp(
      VENUE_DENSITY_LIST_TOKEN_BASE.eventEndTime,
      density,
    ),
  };
}
