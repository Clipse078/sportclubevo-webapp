import { describe, expect, it } from "vitest";
import {
  buildOrgUnitStructureSummaryLine,
  buildSceOrgUnitPreviewModel,
  resolveOrgUnitMembershipRoleLabel,
} from "@/lib/org/org-unit-preview-model";

describe("buildSceOrgUnitPreviewModel", () => {
  it("derives preview metadata without meaningless zero segments", () => {
    const model = buildSceOrgUnitPreviewModel({
      unit: {
        id: "ou1",
        name: "Kinderfussball",
        type: "SUB_DEPARTMENT",
        status: "ACTIVE",
        description: "Kurzbeschreibung",
        childCount: 6,
        teamCount: 8,
        personCount: 14,
      },
      memberships: [
        {
          id: "m1",
          isPrimary: true,
          roleKey: "KOORDINATOR",
          user: null,
          person: {
            id: "p1",
            firstName: "Fabio",
            lastName: "Muster",
            displayName: null,
            email: null,
          },
        },
      ],
    });
    expect(model.typeLabel).toBe("Unterressort");
    expect(model.structureLine).toBe("6 Untereinheiten · 8 Teams · 14 Personen");
    expect(model.responsibility.primaryRoleLabel).toBe("Koordinator/in");
  });

  it("omits structure line when all counts are zero", () => {
    expect(buildOrgUnitStructureSummaryLine({ childCount: 0, teamCount: 0, personCount: 0 })).toBeNull();
  });
});

describe("resolveOrgUnitMembershipRoleLabel", () => {
  it("prefers tenant role names over raw keys", () => {
    expect(
      resolveOrgUnitMembershipRoleLabel("dept_lead", (key) =>
        key === "dept_lead" ? "Ressortleitung" : null,
      ),
    ).toBe("Ressortleitung");
  });
});
