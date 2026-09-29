import { describe, expect, it } from "vitest";
import {
  dedupeAssignableRolesForWizard,
  normalizeRoleIdsForAssignment,
  pickCanonicalClubAdminRole,
} from "@/lib/admin/people-access/wizard-assignable-roles";

describe("wizard-assignable-roles", () => {
  const legacy = {
    id: "legacy",
    name: "Club Admin",
    key: "club_admin_fc_test",
    isSystem: false,
    description: null,
  };
  const canonical = {
    id: "canon",
    name: "Club Admin",
    key: "club_admin__fc-test",
    isSystem: true,
    description: null,
  };
  const trainer = {
    id: "t1",
    name: "Trainer/in",
    key: "trainer",
    isSystem: true,
    description: null,
  };

  it("pickCanonicalClubAdminRole prefers exact tenant key", () => {
    expect(pickCanonicalClubAdminRole([legacy, canonical], canonical.key)?.id).toBe("canon");
  });

  it("dedupeAssignableRolesForWizard exposes one Club Admin option", () => {
    const roles = dedupeAssignableRolesForWizard([legacy, canonical, trainer], canonical.key);
    const clubAdmins = roles.filter((r) => r.name === "Club Admin");
    expect(clubAdmins).toHaveLength(1);
    expect(clubAdmins[0]?.id).toBe("canon");
  });

  it("normalizeRoleIdsForAssignment maps legacy club admin id to canonical", () => {
    const normalized = normalizeRoleIdsForAssignment(
      ["legacy", "t1"],
      [legacy, canonical, trainer],
      canonical.key,
    );
    expect(normalized).toEqual(["canon", "t1"]);
  });
});
