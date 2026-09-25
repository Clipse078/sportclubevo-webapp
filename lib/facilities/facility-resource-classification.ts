/**
 * PLANNING-UX-07R6R1 — sport-agnostic facility resource classification.
 *
 * FacilityResource (id + tenant + facility + type) is the canonical allocatable
 * primitive. Football-specific enum values (FULL_PITCH, HALF_PITCH) are tenant
 * configuration / presentation — not hard engine assumptions.
 *
 * PITCH_HALL remains the legacy product grouping label for primary playable
 * surfaces (football pitches and halls today). Future courts, rinks, and lanes
 * are modeled as FacilityResourceType.OTHER until optional schema extensions.
 */

import type { FacilityResourceType } from "@prisma/client";
import type { TrainingAllocationGroupKey } from "@/lib/training/allocation-groups";

/** Groups exposed by GET /api/facilities/availability (same algorithm for each). */
export type CanonicalAvailabilityGroup = Extract<
  TrainingAllocationGroupKey,
  "PITCH_HALL" | "DRESSING_ROOM" | "OTHER"
>;

/**
 * Maps availability query groups to persisted FacilityResourceType values.
 * Engine logic is identical per group — only the candidate resource filter differs.
 */
export const FACILITY_RESOURCE_TYPES_BY_AVAILABILITY_GROUP: Record<
  CanonicalAvailabilityGroup,
  readonly FacilityResourceType[]
> = {
  /** Primary playable surfaces — football FULL/HALF today; not football-exclusive. */
  PITCH_HALL: ["FULL_PITCH", "HALF_PITCH"],
  DRESSING_ROOM: ["DRESSING_ROOM"],
  /** Generic bookable club resources (courts, rooms, lanes, …) — tenant-defined names. */
  OTHER: ["OTHER"],
};

export function facilityResourceTypesForAvailabilityGroup(
  group: CanonicalAvailabilityGroup,
): FacilityResourceType[] {
  return [...FACILITY_RESOURCE_TYPES_BY_AVAILABILITY_GROUP[group]];
}

const ALL_FACILITY_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  "FULL_PITCH",
  "HALF_PITCH",
  "DRESSING_ROOM",
  "OTHER",
]);

export function isKnownFacilityResourceType(type: string): type is FacilityResourceType {
  return ALL_FACILITY_RESOURCE_TYPES.has(type);
}

/** ID-based allocation rows (EventFacilityAllocation, …) may reference any known resource type. */
export function isGenericAllocatableFacilityResourceType(type: string): boolean {
  return isKnownFacilityResourceType(type);
}
