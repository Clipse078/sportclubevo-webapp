/**
 * Canonical publication defaults for MATCH events at creation time.
 *
 * HOME matches at the tenant facility: all applicable publication channels on.
 * AWAY matches: website, homepage, and team page on; Wochenplan and Infoboard
 * remain off when the product model treats them as home-facility channels.
 *
 * SFV sync and manual/API creation should both use these helpers so defaults stay aligned.
 * Resync paths must not overwrite stored visibility flags (local administrator choice).
 */

export type MatchPublicationDefaults = {
  websiteVisible: boolean;
  infoboardVisible: boolean;
  wochenplanVisible: boolean;
  homepageVisible: boolean;
  teamPageVisible: boolean;
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
  if (isHome) {
    return {
      websiteVisible: true,
      infoboardVisible: true,
      wochenplanVisible: true,
      homepageVisible: true,
      teamPageVisible: true,
    };
  }
  return {
    websiteVisible: true,
    infoboardVisible: false,
    wochenplanVisible: false,
    homepageVisible: true,
    teamPageVisible: true,
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
    homepageVisible: true,
    teamPageVisible: true,
  };
}
