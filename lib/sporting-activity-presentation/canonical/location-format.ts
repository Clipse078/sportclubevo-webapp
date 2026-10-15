import type { SportingActivityLocation } from "@/lib/sporting-activity-presentation/types";

/** Canonical intra-line separator for host → venue → resource hierarchies. */
export const SCE_ACTIVITY_LOCATION_HIERARCHY_SEPARATOR = " · ";

function pushPart(parts: string[], value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return;
  if (parts.some((part) => part.toLowerCase() === trimmed.toLowerCase())) return;
  parts.push(trimmed);
}

export type FormatSceActivityLocationHierarchyOptions = {
  /** When true (default), HOME mode includes host/club before venue/resource (training contract). */
  includeHostClub?: boolean;
  /**
   * Compact planner-list rule: when a concrete playing resource is assigned, omit redundant
   * parent venue labels (e.g. show "Kunstrasen 3 B" not "Kunstrasen 3 · Kunstrasen 3 B").
   */
  mostSpecificResourceOnly?: boolean;
};

function tokenizeLocationPart(value: string): string[] {
  return value
    .trim()
    .toLocaleLowerCase("de-CH")
    .split(/\s+/)
    .filter(Boolean);
}

/** Exported for unit tests — deterministic parent/child resource identity compaction. */
export function venueIsRedundantParentOfResource(venue: string, resource: string): boolean {
  const venueTrimmed = venue.trim();
  const resourceTrimmed = resource.trim();
  if (!venueTrimmed || !resourceTrimmed) {
    return false;
  }
  if (venueTrimmed.toLocaleLowerCase("de-CH") === resourceTrimmed.toLocaleLowerCase("de-CH")) {
    return true;
  }
  const venueTokens = tokenizeLocationPart(venueTrimmed);
  const resourceTokens = tokenizeLocationPart(resourceTrimmed);
  if (resourceTokens.length !== venueTokens.length + 1) {
    return false;
  }
  for (let index = 0; index < venueTokens.length; index += 1) {
    if (resourceTokens[index] !== venueTokens[index]) {
      return false;
    }
  }
  return true;
}

function pushVenueAndResourceParts(parts: string[], venue: string | undefined, resource: string | undefined) {
  const venueTrimmed = venue?.trim();
  const resourceTrimmed = resource?.trim();
  if (resourceTrimmed && venueTrimmed && venueIsRedundantParentOfResource(venueTrimmed, resourceTrimmed)) {
    pushPart(parts, resourceTrimmed);
    return;
  }
  pushPart(parts, venueTrimmed);
  pushPart(parts, resourceTrimmed);
}

/**
 * Deterministic host → venue → resource line for cards and compact surfaces.
 * Omits missing levels without placeholder separators.
 */
export function formatSceActivityLocationHierarchy(
  location: SportingActivityLocation,
  options: FormatSceActivityLocationHierarchyOptions = {},
): string | undefined {
  const includeHost = options.includeHostClub !== false;
  const mostSpecificOnly = options.mostSpecificResourceOnly === true;
  const resource = location.facilityResource?.trim();
  const venue = location.venueName?.trim();
  const parts: string[] = [];

  if (mostSpecificOnly && resource) {
    if (venue && !venueIsRedundantParentOfResource(venue, resource)) {
      pushPart(parts, venue);
    }
    pushPart(parts, resource);
    if (parts.length === 0) {
      return undefined;
    }
    return parts.join(SCE_ACTIVITY_LOCATION_HIERARCHY_SEPARATOR);
  }

  switch (location.mode) {
    case "HOME": {
      if (includeHost) {
        pushPart(parts, location.hostOrOrganiser);
      }
      pushVenueAndResourceParts(parts, location.venueName, location.facilityResource);
      break;
    }
    case "AWAY": {
      if (includeHost) {
        pushPart(parts, location.hostOrOrganiser);
      }
      pushVenueAndResourceParts(parts, location.venueName, location.facilityResource);
      pushPart(parts, location.address);
      break;
    }
    case "NEUTRAL":
    case "UNKNOWN":
    default: {
      if (includeHost) {
        pushPart(parts, location.hostOrOrganiser);
      }
      pushVenueAndResourceParts(parts, location.venueName, location.facilityResource);
      pushPart(parts, location.address);
      break;
    }
  }

  if (parts.length === 0) {
    return undefined;
  }

  const joined = parts.join(SCE_ACTIVITY_LOCATION_HIERARCHY_SEPARATOR);
  if (joined.includes(" ·  · ") || joined.startsWith(" · ") || joined.endsWith(" · ")) {
    return undefined;
  }
  return joined;
}
