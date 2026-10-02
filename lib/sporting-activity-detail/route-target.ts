import { buildGoogleMapsSearchUrl } from "@/lib/communication/personalisation/formatters";
import { formatSportingActivityLocationLines } from "@/lib/sporting-activity-presentation/location";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import type { SportingActivityDetailRouteTarget } from "./types";

/**
 * Builds a maps deep link only when location lines form a trustworthy query.
 * Never concatenates guessed partial fields.
 */
export function resolveSportingActivityDetailRouteTarget(
  presentation: SportingActivityPresentation,
): SportingActivityDetailRouteTarget | null {
  const lines = formatSportingActivityLocationLines(presentation.location);
  if (lines.length === 0) {
    return null;
  }

  const query = lines.join(", ").trim();
  if (!query) {
    return null;
  }

  return {
    label: "Route öffnen",
    href: buildGoogleMapsSearchUrl(query),
  };
}
