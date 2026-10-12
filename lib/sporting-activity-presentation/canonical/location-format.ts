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
};

/**
 * Deterministic host → venue → resource line for cards and compact surfaces.
 * Omits missing levels without placeholder separators.
 */
export function formatSceActivityLocationHierarchy(
  location: SportingActivityLocation,
  options: FormatSceActivityLocationHierarchyOptions = {},
): string | undefined {
  const includeHost = options.includeHostClub !== false;
  const parts: string[] = [];

  switch (location.mode) {
    case "HOME": {
      if (includeHost) {
        pushPart(parts, location.hostOrOrganiser);
      }
      pushPart(parts, location.venueName);
      pushPart(parts, location.facilityResource);
      break;
    }
    case "AWAY": {
      pushPart(parts, location.hostOrOrganiser);
      pushPart(parts, location.venueName);
      pushPart(parts, location.facilityResource);
      pushPart(parts, location.address);
      break;
    }
    case "NEUTRAL":
    case "UNKNOWN":
    default: {
      pushPart(parts, location.hostOrOrganiser);
      pushPart(parts, location.venueName);
      pushPart(parts, location.facilityResource);
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
