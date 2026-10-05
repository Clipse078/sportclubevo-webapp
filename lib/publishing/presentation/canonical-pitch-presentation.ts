/**
 * lib/publishing/presentation/canonical-pitch-presentation.ts
 *
 * FACILITY-INTEGRITY-01A-R1 — canonical facility/resource pitch labels for
 * publication consumers (Infoboard canonical loader, etc.).
 *
 * Resolution order:
 *   1. Canonical FacilityResource.name (when present on the allocation ref)
 *   2. Canonical Facility.name + pitch subdivision (FULL / HALF A / HALF B)
 *   3. Static FCA pitch registry (infoboardLabel, then websiteLabel)
 *   4. Technical code fallback (underscores → spaces)
 *
 * Does not mutate inputs. No DB access.
 */

import { getPitchAllocationByCode } from "@/lib/facilities/pitches";

function meaningful(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export type CanonicalPitchPresentationInput = {
  readonly code: string;
  readonly name?: string | null;
  readonly facilityName?: string | null;
  readonly resourceType?: "FULL_PITCH" | "HALF_PITCH" | "DRESSING_ROOM" | "OTHER";
};

function resolveFacilitySubdivisionLabel(
  facility: string,
  input: CanonicalPitchPresentationInput,
): string | null {
  const entry = getPitchAllocationByCode(input.code);
  if (!entry) return null;

  switch (entry.mode) {
    case "FULL":
      return facility;
    case "HALF_A":
      return `${facility} A`;
    case "HALF_B":
      return `${facility} B`;
    default:
      return null;
  }
}

/**
 * Resolves the human-facing pitch label from canonical weekplanner / DB context.
 */
export function resolveCanonicalPitchPresentationLabel(
  input: CanonicalPitchPresentationInput,
): string | null {
  const resourceName = meaningful(input.name);
  if (resourceName) return resourceName;

  const facility = meaningful(input.facilityName);
  if (facility) {
    const fromFacility = resolveFacilitySubdivisionLabel(facility, input);
    if (fromFacility) return fromFacility;
  }

  const registryEntry = getPitchAllocationByCode(input.code);
  const legacyInfoboard = meaningful(registryEntry?.infoboardLabel);
  if (legacyInfoboard) return legacyInfoboard;

  const legacyWebsite = meaningful(registryEntry?.websiteLabel);
  if (legacyWebsite) return legacyWebsite;

  const code = meaningful(input.code);
  if (code) return code.replace(/_/g, " ");

  return facility ?? null;
}
