import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildAppNavigationModelForUser } from "@/lib/nav/app-navigation-model";
import { pathnameMatchesVereinsentwicklungNavHref } from "@/lib/club-development/vereinsentwicklung-nav-path-aliases";
import { CLUB_TARGET_L2_GROUPS } from "@/lib/nav/nav-ia-v2/target-ia-matrix";

describe("Vereinsentwicklung Sitzungen mega menu", () => {
  it("lists Sitzungen once in Vereinsentwicklung L2 group keys", () => {
    const group = CLUB_TARGET_L2_GROUPS.find((g) => g.id === "vereinsentwicklung")!;
    const sitzungenKeys = group.keys.filter(
      (k) => k === "club-entwicklung-sitzungen" || k === "meetings",
    );
    expect(sitzungenKeys).toEqual(["club-entwicklung-sitzungen"]);
  });

  it("highlights Sitzungen child on meeting list and detail routes", () => {
    const href = "/vereinsleitung/meetings";
    expect(pathnameMatchesVereinsentwicklungNavHref("/vereinsleitung/meetings", href)).toBe(true);
    expect(
      pathnameMatchesVereinsentwicklungNavHref("/vereinsleitung/meetings/demo-slug", href),
    ).toBe(true);
    expect(
      pathnameMatchesVereinsentwicklungNavHref("/vereinsleitung/meetings/demo-slug/edit", href),
    ).toBe(true);
  });

  it("exposes Sitzungen in Vereinsentwicklung hub for VL workspace", () => {
    const withMeetings = buildAppNavigationModelForUser(
      [PERMISSIONS.TARGETS_VIEW, PERMISSIONS.MEETINGS_VIEW],
      "club",
      { vereinsleitungWorkspace: true },
    );
    const club = withMeetings.domains.find((d) => d.id === "club")!;
    const hub = club.destinations.find((d) => d.key === "club-entwicklung");
    expect(hub?.children?.some((c) => c.key === "club-entwicklung-sitzungen")).toBe(true);

    const vlOnlyTargets = buildAppNavigationModelForUser([PERMISSIONS.TARGETS_VIEW], "club", {
      vereinsleitungWorkspace: true,
    });
    const hub2 = vlOnlyTargets.domains
      .find((d) => d.id === "club")!
      .destinations.find((d) => d.key === "club-entwicklung");
    expect(hub2?.children?.some((c) => c.key === "club-entwicklung-sitzungen")).toBe(true);
  });

  it("hides Sitzungen nav child when actor lacks meetings permission and VL bypass", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.TARGETS_VIEW],
      "club",
      { vereinsleitungWorkspace: false },
    );
    const club = model.domains.find((d) => d.id === "club");
    const hub = club?.destinations.find((d) => d.key === "club-entwicklung");
  const sitzungenChild = hub?.children?.find((c) => c.key === "club-entwicklung-sitzungen");
    expect(sitzungenChild === undefined || sitzungenChild === null).toBe(true);
  });
});