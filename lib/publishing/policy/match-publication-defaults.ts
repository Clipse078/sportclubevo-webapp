/**
 * Canonical publication defaults for MATCH events at creation time.
 *
 * HOME matches at the tenant facility: website + Wochenplan + Infoboard on by default.
 * AWAY matches: website on; Wochenplan and Infoboard off by default.
 *
 * SFV sync and manual/API creation should both use these helpers so defaults stay aligned.
 * Resync paths must not overwrite stored visibility flags (local administrator choice).
 */

export type MatchPublicationDefaults = {
  websiteVisible: boolean;
  infoboardVisible: boolean;
  wochenplanVisible: boolean;
};

/**
 * Normalizes home/away for publication default resolution.
 * Returns null for neutral, blank, or unknown values.
 */
export function normalizeMatchHomeAway(
  homeAway: string | null | undefined,
): "HOME" | "AWAY" | null {
  const normalized = homeAway?.trim().toUpperCase() ?? null;
  if (normalized === "HOME") return "HOME";
  if (normalized === "AWAY") return "AWAY";
  return null;
}

/**
 * Publication defaults when importing/creating a match with a known home/away side.
 *
 * @param isHome — true when the tenant club hosts at its facility (SFV sync classification).
 */
export function resolveMatchPublicationDefaultsFromIsHome(
  isHome: boolean,
): MatchPublicationDefaults {
  return {
    websiteVisible: true,
    infoboardVisible: isHome,
    wochenplanVisible: isHome,
  };
}

/**
 * Publication defaults for manual/API match creation from a homeAway string.
 * Unknown/neutral homeAway keeps Wochenplan and Infoboard off (conservative).
 */
export function resolveMatchPublicationDefaultsForCreate(
  homeAway: string | null | undefined,
): MatchPublicationDefaults {
  const side = normalizeMatchHomeAway(homeAway);
  if (side === "HOME") {
    return resolveMatchPublicationDefaultsFromIsHome(true);
  }
  if (side === "AWAY") {
    return resolveMatchPublicationDefaultsFromIsHome(false);
  }
  return {
    websiteVisible: true,
    infoboardVisible: false,
    wochenplanVisible: false,
  };
}
