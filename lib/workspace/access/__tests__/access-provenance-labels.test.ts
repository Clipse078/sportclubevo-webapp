import { describe, expect, it } from "vitest";

import {
  buildAccessInheritanceCopy,
  buildWhyAccessLabel,
} from "@/lib/workspace/access/access-provenance-labels";

describe("WORKSPACE-09-04 access provenance labels", () => {
  it("builds role and team why labels", () => {
    expect(
      buildWhyAccessLabel({
        audience: { kind: "ROLE", functionKey: "trainer" },
        audienceLabel: "Trainer",
        explanationMode: "explicit",
        segmentSource: "explicit_grant",
        inheritedFromResourceName: null,
      }),
    ).toBe("Über Rolle · Trainer");

    expect(
      buildWhyAccessLabel({
        audience: { kind: "TEAM", teamId: "t1" },
        audienceLabel: "Junioren F2",
        explanationMode: "inherited",
        segmentSource: "inherited",
        inheritedFromResourceName: "Vereinsleitung",
      }),
    ).toBe("Geerbt von Vereinsleitung");
  });

  it("builds inheritance headlines for inherit vs explicit", () => {
    expect(
      buildAccessInheritanceCopy({
        policyMode: "INHERIT",
        resourceType: "FOLDER",
        parentName: "Vereinsleitung",
      }).headline,
    ).toBe("Geerbt von: Vereinsleitung");

    expect(
      buildAccessInheritanceCopy({
        policyMode: "EXPLICIT",
        resourceType: "DOCUMENT",
        parentName: null,
      }).headline,
    ).toBe("Eigene Zugriffseinstellungen");
  });
});
