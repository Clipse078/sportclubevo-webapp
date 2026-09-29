import { describe, expect, it } from "vitest";
import { groupRoleChipsForDisplay } from "@/lib/admin/people-access/role-display";

describe("groupRoleChipsForDisplay", () => {
  it("dedupes duplicate club admin role rows with the same display name", () => {
    const chips = groupRoleChipsForDisplay([
      { id: "role-a", name: "Club Admin", key: "club_admin__fc" },
      { id: "role-b", name: "Club Admin", key: "club_admin_fc" },
    ]);
    expect(chips).toHaveLength(1);
    expect(chips[0]?.assignmentCount).toBe(2);
    expect(chips[0]?.roleIds).toEqual(["role-a", "role-b"]);
  });

  it("keeps distinct role names separate", () => {
    const chips = groupRoleChipsForDisplay([
      { id: "1", name: "Trainer/in", key: "trainer" },
      { id: "2", name: "Vorstand", key: "vorstand" },
    ]);
    expect(chips).toHaveLength(2);
  });
});
