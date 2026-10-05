/**
 * FACILITY-INTEGRITY-01A-R1 — canonical pitch presentation for Infoboard / publication.
 */

import { describe, it, expect } from "vitest";
import { resolveCanonicalPitchPresentationLabel } from "../canonical-pitch-presentation";

describe("resolveCanonicalPitchPresentationLabel (FACILITY-INTEGRITY-01A-R1)", () => {
  it("STADION_A with canonical Hauptplatz A resource name → Hauptplatz A", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_A",
        name: "Hauptplatz A",
        facilityName: "Hauptplatz",
        resourceType: "HALF_PITCH",
      }),
    ).toBe("Hauptplatz A");
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_A",
        name: "Hauptplatz A",
        facilityName: "Hauptplatz",
        resourceType: "HALF_PITCH",
      }),
    ).not.toContain("Stadion");
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_A",
        name: "Hauptplatz A",
        facilityName: "Hauptplatz",
        resourceType: "HALF_PITCH",
      }),
    ).not.toMatch(/Feld/i);
  });

  it("STADION with canonical full resource → Hauptplatz", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION",
        name: "Hauptplatz",
        facilityName: "Hauptplatz",
        resourceType: "FULL_PITCH",
      }),
    ).toBe("Hauptplatz");
  });

  it("STADION_B with canonical Hauptplatz B resource → Hauptplatz B", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_B",
        name: "Hauptplatz B",
        facilityName: "Hauptplatz",
        resourceType: "HALF_PITCH",
      }),
    ).toBe("Hauptplatz B");
  });

  it("falls back to static registry when canonical resource name is absent", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_A",
        name: null,
        facilityName: null,
      }),
    ).toBe("Stadion – Feld A");
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
      name: "Hauptplatz A",
      facilityName: "Hauptplatz",
      resourceType: "HALF_PITCH",
    });
    expect(label).toBe("Hauptplatz A");
  });

  it("facility + subdivision when name missing but facility and code present", () => {
    expect(
      resolveCanonicalPitchPresentationLabel({
        code: "STADION_A",
        name: "",
        facilityName: "Hauptplatz",
        resourceType: "HALF_PITCH",
      }),
    ).toBe("Hauptplatz A");
  });
});
