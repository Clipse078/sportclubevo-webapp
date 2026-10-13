import { getPitchAllocationByCode } from "@/lib/facilities/pitches";

function getPitchRegistryDisplayLabel(code: string | null | undefined): string | null {
  return getPitchAllocationByCode(code)?.websiteLabel ?? null;
}
import {
  buildSportingActivityLocation,
  normalizeSportingLocationMode,
  sanitizeImportedVenuePresentation,
} from "./location";
import type { SportingActivityLocation } from "./types";

function meaningful(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function meaningfulVenue(value: string | null | undefined): string | undefined {
  const trimmed = meaningful(value);
  if (!trimmed) return undefined;
  const sanitized = sanitizeImportedVenuePresentation(trimmed);
  return sanitized || undefined;
}

/**
 * Internal allocation keys (enum/slug) that must never render without a
 * registry display label — not a cosmetic title-case formatter.
 */
export function isUnlabeledInternalResourceKey(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (getPitchRegistryDisplayLabel(trimmed)) return true;
  if (/^[A-Z][A-Z0-9_]*$/.test(trimmed) && trimmed.includes("_")) return true;
  if (trimmed === "HAUPTFELD" || trimmed === "STADION") return true;
  return false;
}

/**
 * Resolves a human-facing pitch/resource label for canonical Match presentation.
 * Raw codes never pass through when no legitimate display label exists.
 */
export function resolveCanonicalMatchFacilityResourceLabel(
  pitchCode: string | null | undefined,
  pitchLabel: string | null | undefined,
): string | undefined {
  const code = pitchCode?.trim();
  const label = pitchLabel?.trim();

  if (label) {
    if (isUnlabeledInternalResourceKey(label)) {
      return getPitchRegistryDisplayLabel(code ?? label) ?? undefined;
    }
    if (label === code) {
      return getPitchRegistryDisplayLabel(code) ?? code;
    }
    return label;
  }

  if (code) {
    const fromRegistry = getPitchRegistryDisplayLabel(code);
    if (fromRegistry) return fromRegistry;
    if (isUnlabeledInternalResourceKey(code)) return undefined;
    return code;
  }

  return undefined;
}

function omitDuplicateLocationLevel(
  venueName: string | undefined,
  facilityResource: string | undefined,
): string | undefined {
  if (!venueName || !facilityResource) return facilityResource;
  const venueLower = venueName.toLowerCase();
  const resourceLower = facilityResource.toLowerCase();
  if (venueLower.includes(resourceLower)) return undefined;
  if (resourceLower.length <= 2 && venueLower.endsWith(resourceLower)) return undefined;
  return facilityResource;
}

export type BuildMatchSportingActivityLocationInput = {
  homeAway: string | null | undefined;
  tenantClubName?: string | null;
  homeSideDisplayName: string;
  venueName?: string | null;
  /** Tenant operational pitch allocation — authoritative only for HOME matches. */
  operationalPitchCode?: string | null;
  /** Pre-resolved human label (e.g. facility resource name). */
  resolvedPitchLabel?: string | null;
  /** Provider/external pitch when explicitly supplied (AWAY/neutral). */
  externalPitchLabel?: string | null;
};

/**
 * Canonical Match location: resolves home/away venue ownership before presentation.
 * Tenant facility/resource data must not leak into away/external venue lines.
 */
export function buildMatchSportingActivityLocation(
  input: BuildMatchSportingActivityLocationInput,
): SportingActivityLocation {
  const mode = normalizeSportingLocationMode(input.homeAway);
  const venueName = meaningfulVenue(input.venueName);

  let hostOrOrganiser: string | undefined;
  switch (mode) {
    case "HOME":
      hostOrOrganiser =
        meaningful(input.tenantClubName) ?? meaningful(input.homeSideDisplayName);
      break;
    case "AWAY":
      hostOrOrganiser = meaningful(input.homeSideDisplayName);
      break;
    case "NEUTRAL":
      hostOrOrganiser = meaningful(input.tenantClubName);
      break;
    default:
      break;
  }

  let facilityResource: string | undefined;
  if (mode === "HOME") {
    facilityResource = resolveCanonicalMatchFacilityResourceLabel(
      input.operationalPitchCode,
      input.resolvedPitchLabel,
    );
  } else if (mode === "AWAY" || mode === "NEUTRAL") {
    const external = meaningful(input.externalPitchLabel);
    facilityResource = external
      ? resolveCanonicalMatchFacilityResourceLabel(null, external)
      : undefined;
  }

  facilityResource = omitDuplicateLocationLevel(venueName, facilityResource);

  return buildSportingActivityLocation({
    mode,
    hostOrOrganiser,
    venueName,
    facilityResource,
  });
}
