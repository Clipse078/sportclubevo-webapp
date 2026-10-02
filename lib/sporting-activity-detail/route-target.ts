import { buildGoogleMapsSearchUrl } from "@/lib/communication/personalisation/formatters";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import type { SportingActivityDetailRouteTarget } from "./types";

function meaningful(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Facility or pitch labels alone must not become navigation targets.
 * Accept structured address, comma-separated place lines, or away host + venue pairs.
 */
function resolveTrustworthyNavigationQuery(
  presentation: SportingActivityPresentation,
): string | null {
  const { location } = presentation;
  const address = meaningful(location.address);
  if (address) {
    return address;
  }

  if (location.mode === "HOME") {
    return null;
  }

  const venue = meaningful(location.venueName);
  const host = meaningful(location.hostOrOrganiser);

  if (venue && venue.includes(",")) {
    return host ? `${host}, ${venue}` : venue;
  }

  if (host && venue) {
    return `${host}, ${venue}`;
  }

  return null;
}

/**
 * Builds a maps deep link only when location data forms a trustworthy query.
 */
export function resolveSportingActivityDetailRouteTarget(
  presentation: SportingActivityPresentation,
): SportingActivityDetailRouteTarget | null {
  const query = resolveTrustworthyNavigationQuery(presentation);
  if (!query) {
    return null;
  }

  return {
    label: "Route öffnen",
    href: buildGoogleMapsSearchUrl(query),
  };
}
