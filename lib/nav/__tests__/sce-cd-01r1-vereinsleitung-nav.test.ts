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

  it("shows Vereinsentwicklung for club admins without strategic permission keys (CD-01R2)", () => {
    const sections = getVisibleNavSections([], "club", {
      vereinsleitungWorkspace: true,
    });
    const clubDev = findClubEntwicklung(sections);
    expect(clubDev?.children?.map((c) => c.key)).toEqual([
      "club-entwicklung-uebersicht",
      "club-entwicklung-strategien",
      "club-entwicklung-ziele",
      "club-entwicklung-aufgaben",
      "club-entwicklung-umsetzungsplanung",
      "club-entwicklung-sitzungen",
    ]);
  });

  it("lists Sitzungen for VL workspace members (route still enforces meetings entitlements)", () => {
    const sections = getVisibleNavSections([PERMISSIONS.TARGETS_VIEW], "club", {
      vereinsleitungWorkspace: true,
    });
    const clubDev = findClubEntwicklung(sections);
    expect(clubDev?.children?.map((c) => c.key)).toContain("club-entwicklung-sitzungen");
  });

  it("does not expose Vereinsentwicklung to tenant admin membership permission alone", () => {
    const sections = getVisibleNavSections([PERMISSIONS.USERS_MANAGE_MEMBERSHIPS], "club", {
      vereinsleitungWorkspace: false,
    });
    expect(findClubEntwicklung(sections)).toBeUndefined();
  });
});
