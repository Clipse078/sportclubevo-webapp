/**
 * SCE-PLANNER-UX-08-01 — deterministic scale fixtures (not FCA-specific).
 */

import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

export type PlannerScaleFixtureCase = "small" | "medium" | "large";

export type PlannerScaleFixture = {
  case: PlannerScaleFixtureCase;
  label: string;
  pitchGroups: FacilityGroup[];
  dressingGroups: FacilityGroup[];
  expectedPitchCount: number;
  expectedDressingCount: number;
};

function pitchResource(id: string, facilityId: string, facilityName: string, name: string) {
  return {
    id,
    name,
    code: id,
    type: "FULL_PITCH" as const,
    facilityId,
    facilityName,
  };
}

function dressingResource(id: string, facilityId: string, facilityName: string, name: string) {
  return {
    id,
    name,
    code: id,
    type: "DRESSING_ROOM" as const,
    facilityId,
    facilityName,
  };
}

function facilityPitches(facilityId: string, facilityName: string, count: number, prefix: string): FacilityGroup {
  return {
    facilityId,
    facilityName,
    resources: Array.from({ length: count }, (_, i) =>
      pitchResource(`${facilityId}-p-${i + 1}`, facilityId, facilityName, `${prefix} ${i + 1}`),
    ),
  };
}

function facilityDressing(facilityId: string, facilityName: string, count: number, prefix: string): FacilityGroup {
  return {
    facilityId,
    facilityName,
    resources: Array.from({ length: count }, (_, i) =>
      dressingResource(`${facilityId}-d-${i + 1}`, facilityId, facilityName, `${prefix} ${i + 1}`),
    ),
  };
}

/** CASE A — small club (~3 pitches, ~8 dressing rooms, single site). */
export function buildSmallClubScaleFixture(): PlannerScaleFixture {
  return {
    case: "small",
    label: "Small club",
    pitchGroups: [facilityPitches("site-a", "Im Brüel", 3, "Platz")],
    dressingGroups: [facilityDressing("site-a-dr", "Im Brüel Garderoben", 8, "Kabine")],
    expectedPitchCount: 3,
    expectedDressingCount: 8,
  };
}

/** CASE B — medium club (~10 pitches, ~18 dressing rooms, two sites). */
export function buildMediumClubScaleFixture(): PlannerScaleFixture {
  return {
    case: "medium",
    label: "Medium club",
    pitchGroups: [
      facilityPitches("north", "Sportzentrum Nord", 6, "Platz"),
      facilityPitches("south", "Sportzentrum Süd", 4, "Platz"),
    ],
    dressingGroups: [
      facilityDressing("north-dr", "Sportzentrum Nord", 10, "Kabine"),
      facilityDressing("south-dr", "Sportzentrum Süd", 8, "Kabine"),
    ],
    expectedPitchCount: 10,
    expectedDressingCount: 18,
  };
}

/** CASE C — large club (~20 pitches, ~40 dressing rooms, multi-site). */
export function buildLargeClubScaleFixture(): PlannerScaleFixture {
  return {
    case: "large",
    label: "Large club",
    pitchGroups: [
      facilityPitches("north", "Sportzentrum Nord", 8, "Platz"),
      facilityPitches("south", "Sportzentrum Süd", 7, "Platz"),
      facilityPitches("east", "Campus Ost", 5, "Halle"),
    ],
    dressingGroups: [
      facilityDressing("north-dr", "Sportzentrum Nord", 16, "Kabine"),
      facilityDressing("south-dr", "Sportzentrum Süd", 14, "Kabine"),
      facilityDressing("east-dr", "Campus Ost", 10, "Kabine"),
    ],
    expectedPitchCount: 20,
    expectedDressingCount: 40,
  };
}

export const PLANNER_SCALE_FIXTURES: PlannerScaleFixture[] = [
  buildSmallClubScaleFixture(),
  buildMediumClubScaleFixture(),
  buildLargeClubScaleFixture(),
];
