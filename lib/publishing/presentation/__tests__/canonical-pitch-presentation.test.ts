/**
 * FACILITY-INTEGRITY-01A-R1/R2 — canonical pitch presentation for Infoboard / publication.
 */

import { describe, it, expect } from "vitest";
import { resolveCanonicalPitchPresentationLabel } from "../canonical-pitch-presentation";

describe("resolveCanonicalPitchPresentationLabel (FACILITY-INTEGRITY-01A-R1/R2)", () => {
  it("STADION_A with canonical Hauptfeld A resource name → Hauptfeld A", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_A",
        name: "Hauptfeld A",
        facilityName: "Hauptfeld",
        resourceType: "HALF_PITCH",
      }),
    ).toBe("Hauptfeld A");
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_A",
        name: "Hauptfeld A",
        facilityName: "Hauptfeld",
        resourceType: "HALF_PITCH",
      }),
    ).not.toContain("Stadion");
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_A",
        name: "Hauptfeld A",
        facilityName: "Hauptfeld",
        resourceType: "HALF_PITCH",
      }),
    ).not.toContain("Stadion");
  });

  it("STADION with canonical full resource → Hauptfeld", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION",
        name: "Hauptfeld",
        facilityName: "Hauptfeld",
        resourceType: "FULL_PITCH",
      }),
    ).toBe("Hauptfeld");
  });

  it("STADION_B with canonical Hauptfeld B resource → Hauptfeld B", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_B",
        name: "Hauptfeld B",
        facilityName: "Hauptfeld",
        resourceType: "HALF_PITCH",
      }),
    ).toBe("Hauptfeld B");
  });

  it("falls back to static registry when canonical resource name is absent", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_A",
        name: null,
        facilityName: null,
      }),
    ).toBe("Hauptfeld A");
  });

  it("KUNSTRASEN_2_A with canonical name → Kunstrasen 2 A", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "KUNSTRASEN_2_A",
        name: "Kunstrasen 2 A",
        facilityName: "Kunstrasen 2",
        resourceType: "HALF_PITCH",
      }),
    ).toBe("Kunstrasen 2 A");
  });

  it("KUNSTRASEN_3_B with canonical name → Kunstrasen 3 B", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "KUNSTRASEN_3_B",
        name: "Kunstrasen 3 B",
        facilityName: "Kunstrasen 3",
        resourceType: "HALF_PITCH",
      }),
    ).toBe("Kunstrasen 3 B");
  });

  it("does not require Event.pitchCode mutation — presentation derives from resource ref", () => {
    const label = resolveCanonicalPitchPresentationLabel({
      code: "STADION_A",
      name: "Hauptfeld A",
      facilityName: "Hauptfeld",
      resourceType: "HALF_PITCH",
    });
    expect(label).toBe("Hauptfeld A");
  });

  it("facility + subdivision when name missing but facility and code present", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_A",
        name: "",
        facilityName: "Hauptfeld",
        resourceType: "HALF_PITCH",
      }),
    ).toBe("Hauptfeld A");
  });

  it("canonical FacilityResource.name beats static registry fallback", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION",
        name: "Hauptfeld",
        facilityName: "Hauptfeld",
      }),
    ).toBe("Hauptfeld");
  });
});
