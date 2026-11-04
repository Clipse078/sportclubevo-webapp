/**
 * SCE-INFOBOARD-R23 — Screen 1 Platz value typography scale (~20% vs R22 baseline).
 *
 * Applies only to PLATZ allocation values (green badge text), not Kabine or headings.
 */

/** Approved Product Owner target: ~20% larger Platz value rendering. */
export const VENUE_PLATZ_VALUE_TYPOGRAPHY_SCALE = 1.2;

/** Scales numeric units inside CSS clamp/min/max expressions for Platz values. */
export function scalePlatzValueTypographyClamp(clampCss: string): string {
  return clampCss.replace(/([\d.]+)(rem|cqw|vw|vh|cqh|px)/g, (_, raw, unit) => {
    const scaled = Number.parseFloat(raw) * VENUE_PLATZ_VALUE_TYPOGRAPHY_SCALE;
    const rounded =
      unit === "px" ? String(Math.round(scaled)) : scaled.toFixed(3).replace(/\.?0+$/, "");
    return `${rounded}${unit}`;
  });
}
