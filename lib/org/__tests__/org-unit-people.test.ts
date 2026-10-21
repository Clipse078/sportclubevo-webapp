import { describe, expect, it } from "vitest";
import {
  deriveOrgUnitPeopleFromAssignments,
  pickPreviewStaffPeople,
  responsiblePersonIdentityKeys,
} from "@/lib/org/org-unit-people";
import { deriveOrgUnitResponsibility } from "@/lib/org/org-unit-responsibility";
import { buildSceOrgUnitPreviewModel } from "@/lib/org/org-unit-preview-model";

describe("deriveOrgUnitPeopleFromAssignments", () => {
  it("deduplicates multiple assignments for the same person", () => {
    const result = deriveOrgUnitPeopleFromAssignments([
      {
        id: "a1",
        personId: "p1",
        functionKey: "TRAINER",
        person: { id: "p1", firstName: "Michael", lastName: "Duijster", displayName: null },
        team: { id: "t1", name: "F2", shortName: "F2" },
      },
      {
        id: "a2",
        personId: "p1",
        functionKey: "TRAINER",
        person: { id: "p1", firstName: "Michael", lastName: "Duijster", displayName: null },
        team: { id: "t2", name: "F3", shortName: "F3" },
      },
    ]);
    expect(result.staffCount).toBe(1);
    expect(result.allPeople[0]?.teamLabels).toEqual(["F2", "F3"]);
  });

  it("derives function title from PersonFunctionKey without fabrication", () => {
    const result = deriveOrgUnitPeopleFromAssignments([
      {
        id: "a1",
        personId: "p2",
        functionKey: "TRAINER",
        person: { id: "p2", firstName: "Cirino", lastName: "X", displayName: null },
        team: null,
      },
    ]);
    expect(result.allPeople[0]?.functionTitle).toBe("Trainer/in");
  });

  it("gracefully omits function title when key is unknown and no resolver", () => {
    const result = deriveOrgUnitPeopleFromAssignments([
      {
        id: "a1",
        personId: "p3",
        functionKey: "CUSTOM_UNKNOWN",
        person: { id: "p3", firstName: "A", lastName: "B", displayName: null },
        team: null,
      },
    ]);
    expect(result.allPeople[0]?.functionTitle).toBe("CUSTOM_UNKNOWN");
  });
});

describe("responsibility vs all people", () => {
  it("keeps leadership separate from staff preview list", () => {
    const memberships = [
      {
        id: "m1",
        isPrimary: true,
        roleKey: "KOORDINATOR",
        user: null,
        person: {
          id: "p-lead",
          firstName: "Fabio",
          lastName: "Lead",
          displayName: null,
          email: null,
        },
      },
    ];
    const responsibility = deriveOrgUnitResponsibility(memberships);
    const exclude = responsiblePersonIdentityKeys(responsibility.responsiblePersons);

    const staff = deriveOrgUnitPeopleFromAssignments([
      {
        id: "a1",
        personId: "p-lead",
        functionKey: "TRAINER",
        person: { id: "p-lead", firstName: "Fabio", lastName: "Lead", displayName: null },
        team: null,
      },
      {
        id: "a2",
        personId: "p2",
        functionKey: "TRAINER",
        person: { id: "p2", firstName: "Michael", lastName: "D", displayName: null },
        team: null,
      },
    ]);

    const preview = pickPreviewStaffPeople({
      allPeople: staff.allPeople,
      excludeIdentityKeys: exclude,
      maxVisible: 2,
    });
    expect(preview.visible.map((p) => p.personId)).toEqual(["p2"]);
    expect(preview.additionalCount).toBe(0);
  });
});

describe("buildSceOrgUnitPreviewModel staff preview", () => {
  it("limits visible staff and surfaces + N weitere", () => {
    const assignments = ["p1", "p2", "p3", "p4"].map((id, i) => ({
      id: `a${i}`,
      personId: id,
      functionKey: "TRAINER",
      person: { id, firstName: `Person${i}`, lastName: "X", displayName: null },
      team: null,
    }));

    const model = buildSceOrgUnitPreviewModel({
      unit: {
        id: "ou1",
        name: "Kinderfussball",
        type: "SUB_DEPARTMENT",
        status: "ACTIVE",
        description: null,
        childCount: 0,
        teamCount: 8,
        staffCount: 4,
      },
      memberships: [],
      staffAssignments: assignments,
    });

    expect(model.staff.previewPeople).toHaveLength(2);
    expect(model.staff.additionalCount).toBe(2);
    expect(model.structureLine).toBe("8 Teams · 4 Mitarbeitende");
  });
});
