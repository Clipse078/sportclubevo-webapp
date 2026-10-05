/**
 * SCE-PLANNER-UX-08-05R4 — deterministic manipulation availability scale fixtures (tests only).
 */

import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { buildPlanningResourceGroupsFromFacilityGroups } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";

export type ManipulationAvailabilityScaleCase = "small_fca" | "medium" | "large";

function pitchFacilityWithHalves(
  facilityId: string,
  facilityName: string,
  baseName: string,
): FacilityGroup {
  const fullId = `${facilityId}-full`;
  const aId = `${facilityId}-a`;
  const bId = `${facilityId}-b`;
  return {
    facilityId,
    facilityName,
    resources: [
      {
        id: fullId,
        name: baseName,
        code: fullId,
        type: "FULL_PITCH",
        facilityId,
        facilityName,
      },
      {
        id: aId,
        name: `${baseName} A`,
        code: aId,
        type: "HALF_PITCH",
        facilityId,
        facilityName,
      },
      {
        id: bId,
        name: `${baseName} B`,
        code: bId,
        type: "HALF_PITCH",
        facilityId,
        facilityName,
      },
    ],
  };
}

function standalonePitchFacility(facilityId: string, facilityName: string, label: string): FacilityGroup {
  return {
    facilityId,
    facilityName,
    resources: [
      {
        id: `${facilityId}-p`,
        name: label,
        code: facilityId,
        type: "FULL_PITCH",
        facilityId,
        facilityName,
      },
    ],
  };
}

function dressingFacility(facilityId: string, facilityName: string, count: number, prefix: string): FacilityGroup {
  return {
    facilityId,
    facilityName,
    resources: Array.from({ length: count }, (_, i) => ({
      id: `${facilityId}-d-${i + 1}`,
      name: `${prefix} ${i + 1}`,
      code: `${facilityId}-d-${i + 1}`,
      type: "DRESSING_ROOM" as const,
      facilityId,
      facilityName,
    })),
  };
}

/** ~4 physical pitch groups — FCA-like compact matrix. */
export function buildManipulationAvailabilitySmallFcaCatalog(): FacilityGroup[] {
  return [
    pitchFacilityWithHalves("fca-hf", "Im Brüel", "Hauptfeld"),
    pitchFacilityWithHalves("fca-hp", "Im Brüel", "Hauptplatz"),
    pitchFacilityWithHalves("fca-kr2", "Im Brüel", "Kunstrasen 2"),
    pitchFacilityWithHalves("fca-kr3", "Im Brüel", "Kunstrasen 3"),
  ];
}

/** 10 physical pitch groups across two canonical facilityName sites. */
export function buildManipulationAvailabilityMediumCatalog(): FacilityGroup[] {
  const north = Array.from({ length: 6 }, (_, i) =>
    standalonePitchFacility(`north-p-${i + 1}`, "Sportzentrum Nord", `Platz ${i + 1}`),
  );
  const south = Array.from({ length: 4 }, (_, i) =>
    standalonePitchFacility(`south-p-${i + 1}`, "Sportzentrum Süd", `Platz ${i + 1}`),
  );
  return [...north, ...south];
}

/** 24 physical pitch groups across three sites. */
export function buildManipulationAvailabilityLargeCatalog(): FacilityGroup[] {
  const north = Array.from({ length: 10 }, (_, i) =>
    standalonePitchFacility(`north-lg-${i + 1}`, "Sportzentrum Nord", `Platz ${i + 1}`),
  );
  const south = Array.from({ length: 8 }, (_, i) =>
    standalonePitchFacility(`south-lg-${i + 1}`, "Sportzentrum Süd", `Platz ${i + 1}`),
  );
  const stadium = Array.from({ length: 6 }, (_, i) =>
    standalonePitchFacility(`stadion-lg-${i + 1}`, "Stadionanlage", `Nebenplatz ${i + 1}`),
  );
  return [...north, ...south, ...stadium];
}

export function manipulationAvailabilityPhysicalGroupCount(catalog: readonly FacilityGroup[]): number {
  return buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch").length;
}

export function buildManipulationAvailabilityLargeDressingCatalog(count = 24): FacilityGroup[] {
  return [
    dressingFacility("dr-north", "Sportzentrum Nord", Math.ceil(count / 2), "Kabine"),
    dressingFacility("dr-south", "Sportzentrum Süd", Math.floor(count / 2), "Kabine"),
  ];
}
