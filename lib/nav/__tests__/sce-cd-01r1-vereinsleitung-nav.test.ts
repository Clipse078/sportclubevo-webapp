import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getVisibleNavSections } from "@/lib/nav/nav-config";

const STRATEGIC_PERMS = [
  PERMISSIONS.TARGETS_VIEW,
  PERMISSIONS.TARGETS_MANAGE,
  PERMISSIONS.MEETINGS_VIEW,
  PERMISSIONS.INITIATIVES_VIEW,
] as const;

function findClubEntwicklung(sections: ReturnType<typeof getVisibleNavSections>) {
  return sections
    .flatMap((s) => s.items)
    .find((item) => item.key === "club-entwicklung");
}

describe("SCE-CD-01R1 Vereinsleitung nav visibility", () => {
  it("hides Vereinsentwicklung when user lacks VL membership despite strategic permissions", () => {
    const sections = getVisibleNavSections([...STRATEGIC_PERMS], "club", {
      vereinsleitungWorkspace: false,
    });
    expect(findClubEntwicklung(sections)).toBeUndefined();
  });

  it("shows Vereinsentwicklung for VL members with strategic permissions", () => {
    const sections = getVisibleNavSections([...STRATEGIC_PERMS], "club", {
      vereinsleitungWorkspace: true,
    });
    const clubDev = findClubEntwicklung(sections);
    expect(clubDev?.href).toBe("/vereinsleitung/club-entwicklung");
    expect(clubDev?.children?.length).toBeGreaterThan(0);
  });

  it("does not expose Vereinsentwicklung to tenant admin membership permission alone", () => {
    const sections = getVisibleNavSections([PERMISSIONS.USERS_MANAGE_MEMBERSHIPS], "club", {
      vereinsleitungWorkspace: false,
    });
    expect(findClubEntwicklung(sections)).toBeUndefined();
  });
});
