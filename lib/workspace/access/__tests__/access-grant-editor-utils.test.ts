import { describe, expect, it } from "vitest";

import {
  audienceKeyFromMutationFields,
  buildMutationFieldsFromAudienceSelection,
  upsertGrantRule,
} from "@/lib/workspace/access/access-grant-editor-utils";

describe("access-grant-editor-utils", () => {
  it("W03-A1-17 Team selection maps to one TEAM grant", () => {
    const fields = buildMutationFieldsFromAudienceSelection({
      audienceType: "TEAM",
      selection: { type: "TEAM", id: "team-1", label: "U17" },
      accessLevel: "VIEW",
    });
    expect(fields).toEqual({
      subjectType: "TEAM",
      accessLevel: "VIEW",
      teamId: "team-1",
    });
    expect(audienceKeyFromMutationFields(fields!)).toBe("TEAM:team-1");
  });

  it("W03-A1-18 OrgUnit selection maps to one ORG_UNIT grant", () => {
    const fields = buildMutationFieldsFromAudienceSelection({
      audienceType: "ORG_UNIT",
      selection: { type: "ORG_UNIT", id: "ou-1", label: "Junioren" },
      accessLevel: "EDIT",
    });
    expect(fields?.orgUnitId).toBe("ou-1");
    expect(fields?.subjectType).toBe("ORG_UNIT");
  });

  it("W03-A1-19 Role selection maps to one ROLE grant", () => {
    const fields = buildMutationFieldsFromAudienceSelection({
      audienceType: "ROLE",
      selection: {
        type: "ROLE",
        id: "TRAINER",
        label: "Trainer/in",
        functionKey: "TRAINER",
      },
      accessLevel: "VIEW",
    });
    expect(fields?.roleFunctionKey).toBe("TRAINER");
    expect(fields?.subjectType).toBe("ROLE");
  });

  it("upsert replaces duplicate audience keys", () => {
    const first = upsertGrantRule(
      [],
      { subjectType: "TEAM", accessLevel: "VIEW", teamId: "t1" },
      {
        audienceLabel: "Team A",
        accessLevelLabel: "Lesen",
        accessLevelDescription: "",
      },
    );
    const second = upsertGrantRule(
      first,
      { subjectType: "TEAM", accessLevel: "MANAGE", teamId: "t1" },
      {
        audienceLabel: "Team A",
        accessLevelLabel: "Verwalten",
        accessLevelDescription: "",
      },
    );
    expect(second).toHaveLength(1);
    expect(second[0]?.accessLevel).toBe("MANAGE");
  });
});
