import type { SportingActivityLocation, SportingLocationMode } from "./types";

export function normalizeSportingLocationMode(
  homeAway: string | null | undefined,
): SportingLocationMode {
  if (!homeAway?.trim()) return "UNKNOWN";
  const normalized = homeAway.trim().toUpperCase();
  if (normalized === "HOME" || normalized === "H") return "HOME";
  if (normalized === "AWAY" || normalized === "A") return "AWAY";
  if (normalized === "NEUTRAL" || normalized === "N") return "NEUTRAL";
  return "UNKNOWN";
}

function meaningful(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export type BuildSportingActivityLocationInput = {
  mode: SportingLocationMode;
  hostOrOrganiser?: string | null;
  venueName?: string | null;
  address?: string | null;
  facilityResource?: string | null;
};

export function buildSportingActivityLocation(
  input: BuildSportingActivityLocationInput,
): SportingActivityLocation {
  return {
    mode: input.mode,
    hostOrOrganiser: meaningful(input.hostOrOrganiser),
    venueName: meaningful(input.venueName),
    address: meaningful(input.address),
    facilityResource: meaningful(input.facilityResource),
  };
}

/**
 * Canonical location line hierarchy (HOME / AWAY / NEUTRAL).
 * Returns 0..n human lines without field labels or placeholder noise.
 */
export function formatSportingActivityLocationLines(
  location: SportingActivityLocation,
  options: { tenantDisplayNames?: string[] } = {},
): string[] {
  const suppress = new Set(
    (options.tenantDisplayNames ?? [])
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );

  const lines: string[] = [];
  const push = (value: string | undefined) => {
    if (!value) return;
    const normalized = value.trim();
    if (!normalized) return;
    if (suppress.has(normalized.toLowerCase())) return;
    if (lines.some((line) => line.toLowerCase() === normalized.toLowerCase())) return;
    lines.push(normalized);
  };

  switch (location.mode) {
    case "HOME": {
      push(location.venueName);
      push(location.facilityResource);
      push(location.address);
      break;
    }
    case "AWAY": {
      push(location.hostOrOrganiser);
      push(location.venueName);
      push(location.address);
      push(location.facilityResource);
      break;
    }
    case "NEUTRAL":
    case "UNKNOWN":
    default: {
      push(location.hostOrOrganiser);
      push(location.venueName);
      push(location.address);
      push(location.facilityResource);
      break;
    }
  }

  return lines;
}

export function formatSportingActivityLocationSummary(
  location: SportingActivityLocation,
  options: { tenantDisplayNames?: string[] } = {},
): string | undefined {
  const lines = formatSportingActivityLocationLines(location, options);
  return lines.length > 0 ? lines.join("\n") : undefined;
}
