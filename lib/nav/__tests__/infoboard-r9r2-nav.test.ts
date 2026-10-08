import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  isModuleLocalChildPrimaryActive,
  isNavigationChildActive,
  resolveActiveAppNavigation,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import {
  PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE,
  SANDRA_FISCHER_SPIELBETRIEB_ROLE,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

function l3ActiveLabels(
  permissionKeys: PermissionKey[],
  pathname: string,
): string[] {
  const model = buildAppNavigationModelForUser(permissionKeys, "club");
  const active = resolveActiveAppNavigation(pathname, model);
  return active.moduleLocalChildren
    .filter((child) =>
      isModuleLocalChildPrimaryActive(
        pathname,
        child,
        active.moduleLocalChildren,
        active.activeChildKey,
      ),
    )
    .map((child) => child.label);
}

describe("R9R2 — Infoboard Übersicht/Vorschau sibling navigation", () => {
  it("manage actor at overview — Übersicht active, Vorschau href correct", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.INFOBOARD_VIEW, PERMISSIONS.INFOBOARD_MANAGE, PERMISSIONS.WEBSITE_VIEW],
      "club",
    );
    const active = resolveActiveAppNavigation("/dashboard/infoboard", model);
    const preview = active.moduleLocalChildren.find((c) => c.key === "infoboard-preview");
    expect(l3ActiveLabels(
      [PERMISSIONS.INFOBOARD_VIEW, PERMISSIONS.INFOBOARD_MANAGE, PERMISSIONS.WEBSITE_VIEW],
      "/dashboard/infoboard",
    )).toEqual(["Übersicht"]);
    expect(preview?.href).toBe("/dashboard/infoboard/preview");
  });

  it("manage actor at preview — Vorschau active, Übersicht not prefix-active", () => {
    const pathname = "/dashboard/infoboard/preview";
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const active = resolveActiveAppNavigation(pathname, model);
    const overview = active.moduleLocalChildren.find((c) => c.key === "infoboard-overview")!;
    expect(l3ActiveLabels(CLUB_ADMIN_KEYS, pathname)).toEqual(["Vorschau"]);
    expect(isNavigationChildActive(pathname, overview)).toBe(false);
    expect(overview.href).toBe("/dashboard/infoboard");
  });

  it("deep editor route — Übersicht remains primary among siblings", () => {
    expect(l3ActiveLabels(CLUB_ADMIN_KEYS, "/dashboard/infoboard/abc-board-id")).toEqual([
      "Übersicht",
    ]);
  });

  it("Sandra and Patrick permission sets expose both siblings", () => {
    for (const role of [SANDRA_FISCHER_SPIELBETRIEB_ROLE, PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE]) {
      const keys = [...role.permissionKeys] as PermissionKey[];
      const model = buildAppNavigationModelForUser(keys, "club");
      const active = resolveActiveAppNavigation("/dashboard/infoboard/preview", model);
      expect(active.moduleLocalChildren.map((c) => c.key)).toEqual([
        "infoboard-overview",
        "infoboard-preview",
      ]);
    }
  });

  it("nested sibling fallback — preview path does not activate overview", () => {
    expect(
      l3ActiveLabels(CLUB_ADMIN_KEYS, "/dashboard/infoboard/preview"),
    ).toEqual(["Vorschau"]);
  });

  it("view-only actor — preview child only in nav config visibility", () => {
    const infoboard = getVisibleNavSections([PERMISSIONS.INFOBOARD_VIEW])
      .flatMap((section) => section.items)
      .find((item) => item.key === "infoboard");
    expect(infoboard?.children?.map((c) => c.key)).toEqual(["infoboard-preview"]);
  });
});
