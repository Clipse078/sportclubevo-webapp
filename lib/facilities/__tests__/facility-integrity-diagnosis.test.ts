import { describe, expect, it } from "vitest";
import {
  classifyHauptfeldHauptplatzPair,
  diagnoseTenantFacilityIntegrity,
  type FacilityIntegrityFacilitySnapshot,
} from "../facility-integrity-diagnosis";

const fcaStageLikeCatalog: FacilityIntegrityFacilitySnapshot[] = [
  {
    id: "fac-hauptfeld",
    name: "Hauptfeld",
    type: "PITCH",
    status: "ACTIVE",
    resources: [
      { id: "r-hf", code: "HAUPTFELD", name: "Hauptfeld", type: "FULL_PITCH", status: "ACTIVE" },
      { id: "r-hfa", code: "HAUPTFELD A", name: "Hauptfeld A", type: "HALF_PITCH", status: "ACTIVE" },
      { id: "r-hfb", code: "HAUPTFELD B", name: "Hauptfeld B", type: "HALF_PITCH", status: "ACTIVE" },
    ],
  },
  {
    id: "fac-hauptplatz",
    name: "Hauptplatz",
    type: "PITCH",
    status: "ACTIVE",
    resources: [
      { id: "r-st", code: "STADION", name: "Hauptplatz", type: "FULL_PITCH", status: "ACTIVE" },
      { id: "r-sta", code: "STADION_A", name: "Hauptplatz A", type: "HALF_PITCH", status: "ACTIVE" },
      { id: "r-stb", code: "STADION_B", name: "Hauptplatz B", type: "HALF_PITCH", status: "ACTIVE" },
    ],
  },
  {
    id: "fac-kr2",
    name: "Kunstrasen 2",
    type: "PITCH",
    status: "ACTIVE",
    resources: [
      { id: "r-k2", code: "KUNSTRASEN_2", name: "Kunstrasen 2", type: "FULL_PITCH", status: "ACTIVE" },
      { id: "r-k2a", code: "KUNSTRASEN_2_A", name: "Kunstrasen 2 A", type: "HALF_PITCH", status: "ACTIVE" },
      { id: "r-k2b", code: "KUNSTRASEN_2_B", name: "Kunstrasen 2 B", type: "HALF_PITCH", status: "ACTIVE" },
    ],
  },
];

describe("diagnoseTenantFacilityIntegrity", () => {
  it("flags legacy HAUPTFELD* coexisting with STADION* (FCA STAGE pattern)", () => {
    const findings = diagnoseTenantFacilityIntegrity(fcaStageLikeCatalog);
    const main = findings.find((f) => f.code === "LEGACY_CANONICAL_MAIN_PITCH_PAIR");
    expect(main).toBeDefined();
    expect(main?.facilityIds).toContain("fac-hauptfeld");
    expect(main?.facilityIds).toContain("fac-hauptplatz");
  });

  it("does not flag a clean canonical-only catalog", () => {
    const clean = fcaStageLikeCatalog.filter((f) => f.id !== "fac-hauptfeld");
    const findings = diagnoseTenantFacilityIntegrity(clean);
    expect(findings.some((f) => f.code === "LEGACY_CANONICAL_MAIN_PITCH_PAIR")).toBe(false);
  });
});

describe("classifyHauptfeldHauptplatzPair", () => {
  it("classifies FCA STAGE as legacy + canonical on two facilities", () => {
    expect(
      classifyHauptfeldHauptplatzPair({
        legacyMainCodesPresent: ["HAUPTFELD", "HAUPTFELD A"],
        canonicalMainCodesPresent: ["STADION", "STADION_A"],
        legacyFacilityIds: ["fac-hauptfeld"],
        canonicalFacilityIds: ["fac-hauptplatz"],
      }),
    ).toBe("B_LEGACY_AND_CANONICAL");
  });
});
