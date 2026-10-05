import { describe, expect, it } from "vitest";
import { diagnoseTenantFacilityIntegrity } from "@/lib/facilities/facility-integrity-diagnosis";
import {
  buildLegacyToCanonicalResourceIdMap,
  buildReferenceMatrix,
  countActiveMainPitchFacilities,
  inventoryFromFacilities,
} from "@/lib/facilities/fca-main-pitch-consolidation";
import {
  FCA_MAIN_PITCH_LEGACY_TO_CANONICAL,
  resolveFcaMainPitchCanonicalCode,
} from "@/lib/facilities/fca-main-pitch-legacy-codes";
import { getPitchAllocationByCode } from "@/lib/facilities/pitches";
import { getPitchDisplayLabel } from "@/lib/facilities/display-helpers";
import { buildFacilityGroupsByAllocationGroupFromFacilities } from "@/lib/planning-hub/facility-groups";

const LEGACY_FACILITY_ID = "fac-hauptfeld";
const CANONICAL_FACILITY_ID = "fac-hauptplatz";

const legacyFacility = {
  id: LEGACY_FACILITY_ID,
  name: "Hauptfeld",
  type: "PITCH" as const,
  status: "ACTIVE" as const,
  resources: [
    { id: "r-hf", code: "HAUPTFELD", name: "Hauptfeld", type: "FULL_PITCH" as const, status: "ACTIVE" as const },
    { id: "r-hfa", code: "HAUPTFELD A", name: "Hauptfeld A", type: "HALF_PITCH" as const, status: "ACTIVE" as const },
    { id: "r-hfb", code: "HAUPTFELD B", name: "Hauptfeld B", type: "HALF_PITCH" as const, status: "ACTIVE" as const },
  ],
};

const canonicalFacility = {
  id: CANONICAL_FACILITY_ID,
  name: "Hauptfeld",
  type: "PITCH" as const,
  status: "ACTIVE" as const,
  resources: [
    { id: "r-st", code: "STADION", name: "Hauptfeld", type: "FULL_PITCH" as const, status: "ACTIVE" as const },
    { id: "r-sta", code: "STADION_A", name: "Hauptfeld A", type: "HALF_PITCH" as const, status: "ACTIVE" as const },
    { id: "r-stb", code: "STADION_B", name: "Hauptfeld B", type: "HALF_PITCH" as const, status: "ACTIVE" as const },
  ],
};

const kunstrasen2 = {
  id: "fac-kr2",
  name: "Kunstrasen 2",
  type: "PITCH" as const,
  status: "ACTIVE" as const,
  resources: [
    { id: "r-k2", code: "KUNSTRASEN_2", name: "Kunstrasen 2", type: "FULL_PITCH" as const, status: "ACTIVE" as const },
    { id: "r-k2a", code: "KUNSTRASEN_2_A", name: "Kunstrasen 2 A", type: "HALF_PITCH" as const, status: "ACTIVE" as const },
    { id: "r-k2b", code: "KUNSTRASEN_2_B", name: "Kunstrasen 2 B", type: "HALF_PITCH" as const, status: "ACTIVE" as const },
  ],
};

describe("FCA main-pitch consolidation (FACILITY-INTEGRITY-01A)", () => {
  it("A — detects legacy + canonical dataset (B_LEGACY_AND_CANONICAL)", () => {
    const { inventory, errors } = inventoryFromFacilities("tenant-1", "fc-allschwil", [
      legacyFacility,
      canonicalFacility,
      kunstrasen2,
    ]);
    expect(errors).toEqual([]);
    expect(inventory?.classification).toBe("B_LEGACY_AND_CANONICAL");
  });

  it("B — builds legacy → canonical resource id map", () => {
    const { inventory } = inventoryFromFacilities("tenant-1", "fc-allschwil", [
      legacyFacility,
      canonicalFacility,
    ]);
    const map = buildLegacyToCanonicalResourceIdMap(inventory!);
    expect(map.get("r-hfa")).toBe("r-sta");
    expect(map.get("r-hf")).toBe("r-st");
    expect(map.get("r-hfb")).toBe("r-stb");
  });

  it("C–E — reference matrix rows cover FK paths and pitchCode", () => {
    const matrix = buildReferenceMatrix({
      "HAUPTFELD A": { TrainingSessionAllocation: 1 },
      STADION: { "Event.pitchCode": 4 },
      STADION_A: { "Event.pitchCode": 1 },
    });
    const tsa = matrix.find((r) => r.source === "TrainingSessionAllocation");
    expect(tsa?.legacyCount).toBe(1);
    expect(tsa?.reconciliationAction).toContain("Re-point");
    const pitch = matrix.find((r) => r.source === "Event.pitchCode");
    expect(pitch?.targetCount).toBe(5);
  });

  it("F — legacy pitchCode resolves for historical readability", () => {
    expect(resolveFcaMainPitchCanonicalCode("HAUPTFELD A")).toBe("STADION_A");
    expect(getPitchAllocationByCode("HAUPTFELD A")?.code).toBe("STADION_A");
    expect(getPitchAllocationByCode("HAUPTFELD A")?.label).toBe("Hauptfeld A");
    expect(getPitchDisplayLabel("STADION")).toBe("Hauptfeld");
    expect(getPitchDisplayLabel("STADION_A")).toBe("Hauptfeld A");
    expect(getPitchDisplayLabel("STADION_B")).toBe("Hauptfeld B");
  });

  it("G — canonical code map matches diagnosis constants", () => {
    expect(FCA_MAIN_PITCH_LEGACY_TO_CANONICAL["HAUPTFELD B"]).toBe("STADION_B");
  });

  it("J — archived superseded facility excluded from active planner inventory", () => {
    const consolidated = [
      { ...legacyFacility, status: "ARCHIVED" as const },
      canonicalFacility,
      kunstrasen2,
    ];
    expect(countActiveMainPitchFacilities(consolidated)).toBe(1);
    const findings = diagnoseTenantFacilityIntegrity(consolidated);
    expect(findings.some((f) => f.code === "LEGACY_CANONICAL_MAIN_PITCH_PAIR")).toBe(false);
  });

  it("K — planner facility groups show one Hauptfeld after consolidation", () => {
    const groups = buildFacilityGroupsByAllocationGroupFromFacilities([canonicalFacility, kunstrasen2]);
    const pitchNames = groups.PITCH_HALL.map((g) => g.facilityName);
    expect(pitchNames).toContain("Hauptfeld");
    expect(pitchNames.filter((n) => n === "Hauptfeld")).toHaveLength(1);
  });

  it("L — infoboard ambiguity finding cleared when only STADION* active", () => {
    const findings = diagnoseTenantFacilityIntegrity([canonicalFacility, kunstrasen2]);
    expect(findings.some((f) => f.code === "LEGACY_CANONICAL_MAIN_PITCH_PAIR")).toBe(false);
  });

  it("P — unexpected dataset shape fails safely", () => {
    const onlyLegacy = inventoryFromFacilities("tenant-1", "fc-allschwil", [legacyFacility]);
    expect(onlyLegacy.inventory).toBeNull();
    expect(onlyLegacy.errors.length).toBeGreaterThan(0);
  });
});
