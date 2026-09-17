import type { WeekplannerResourceRef } from "./types";

export type PitchResourceType = "FULL_PITCH" | "HALF_PITCH";

/** True when both refs describe the same physical pitch capacity (exact id or FULL↔HALF within one facility). */
export function facilityResourcesSharePitchCapacity(
  a: Pick<WeekplannerResourceRef, "facilityResourceId" | "facilityId" | "resourceType">,
  b: Pick<WeekplannerResourceRef, "facilityResourceId" | "facilityId" | "resourceType">,
): boolean {
  if (a.facilityResourceId === b.facilityResourceId) return true;

  const typeA = a.resourceType;
  const typeB = b.resourceType;
  if (!typeA || !typeB) return false;
  if (a.facilityId !== b.facilityId) return false;

  const aIsPitch = typeA === "FULL_PITCH" || typeA === "HALF_PITCH";
  const bIsPitch = typeB === "FULL_PITCH" || typeB === "HALF_PITCH";
  if (!aIsPitch || !bIsPitch) return false;

  if (typeA === "FULL_PITCH" && typeB === "HALF_PITCH") return true;
  if (typeA === "HALF_PITCH" && typeB === "FULL_PITCH") return true;

  return false;
}

export function facilityResourcesShareConflictCapacity(
  a: WeekplannerResourceRef,
  b: WeekplannerResourceRef,
): boolean {
  if (a.facilityResourceId === b.facilityResourceId) return true;

  const aIsPitch = a.resourceType === "FULL_PITCH" || a.resourceType === "HALF_PITCH";
  const bIsPitch = b.resourceType === "FULL_PITCH" || b.resourceType === "HALF_PITCH";
  if (aIsPitch && bIsPitch) {
    return facilityResourcesSharePitchCapacity(a, b);
  }

  return false;
}
