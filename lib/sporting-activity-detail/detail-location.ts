import { formatSportingActivityLocationLines } from "@/lib/sporting-activity-presentation/location";
import type { SportingActivityLocation } from "@/lib/sporting-activity-presentation/types";

export type SportingActivityDetailLocationOptions = {
  /** Include own-club name for HOME training (detail-only; compact agenda unchanged). */
  includeHomeClub?: boolean;
  /** Hide away host / organiser when already shown in the hero. */
  omitHostOrOrganiser?: boolean;
};

/**
 * Activity Detail location lines — stronger club context for HOME training without
 * changing compact programme/calendar location derivation.
 */
export function formatSportingActivityDetailLocationLines(
  location: SportingActivityLocation,
  options: SportingActivityDetailLocationOptions = {},
): string[] {
  const base = formatSportingActivityLocationLines(location);

  if (options.omitHostOrOrganiser && location.hostOrOrganiser?.trim()) {
    const hostKey = location.hostOrOrganiser.trim().toLowerCase();
    const filtered = base.filter((line) => line.trim().toLowerCase() !== hostKey);
    return filtered;
  }

  if (!options.includeHomeClub || location.mode !== "HOME") {
    return base;
  }

  const club = location.hostOrOrganiser?.trim();
  if (!club) {
    return base;
  }
  if (base.some((line) => line.trim().toLowerCase() === club.toLowerCase())) {
    return base;
  }
  return [club, ...base];
}
