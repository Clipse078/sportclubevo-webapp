import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import {
  PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE,
  PILOT_FORBIDDEN_PERMISSION_KEYS,
  SANDRA_FISCHER_SPIELBETRIEB_ROLE,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";

function collectHrefs(permissionKeys: readonly string[]) {
  return getVisibleNavSections([...permissionKeys]).flatMap((section) =>
    section.items.flatMap((item) => [
      item.href,
      ...(item.children?.map((child) => child.href) ?? []),
    ]),
  );
}

describe("R9R1 — Infoboard operational access", () => {
  it("Sandra — infoboard.view + infoboard.manage; management overview in nav", () => {
    const keys = SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys;
    expect(keys).toContain(PERMISSIONS.INFOBOARD_VIEW);
    expect(keys).toContain(PERMISSIONS.INFOBOARD_MANAGE);
    expect(keys).not.toContain(PERMISSIONS.INFOBOARD_DELETE);
    expect(keys).not.toContain(PERMISSIONS.USERS_IMPERSONATE_TENANT);
    expect(keys).not.toContain(PERMISSIONS.PEOPLE_VIEW);
    expect(keys).not.toContain(PERMISSIONS.ROLES_MANAGE);

    const hrefs = collectHrefs(keys);
    expect(hrefs).toContain("/dashboard/infoboard");
    expect(hrefs).toContain("/dashboard/infoboard/preview");
  });

  it("Patrick — inherits Sandra Infoboard baseline + operational overview", () => {
    const sandra = new Set(SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys);
    const keys = PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.permissionKeys;
    for (const key of sandra) {
      expect(keys).toContain(key);
    }
    expect(keys).toContain(PERMISSIONS.INFOBOARD_MANAGE);
    expect(collectHrefs(keys)).toContain("/dashboard/infoboard");
  });

  it("view-only actor — preview child only; overview child hidden (parent href redirects at route)", () => {
    const sections = getVisibleNavSections([PERMISSIONS.INFOBOARD_VIEW]);
    const infoboard = sections.flatMap((s) => s.items).find((i) => i.key === "infoboard");
    expect(infoboard?.children?.map((c) => c.href)).toEqual(["/dashboard/infoboard/preview"]);
    expect(collectHrefs([PERMISSIONS.INFOBOARD_VIEW])).toContain("/dashboard/infoboard/preview");
  });

  it("unauthorized actor — no Infoboard nav", () => {
    const hrefs = collectHrefs([PERMISSIONS.TASKS_VIEW]);
    expect(hrefs).not.toContain("/dashboard/infoboard");
    expect(hrefs).not.toContain("/dashboard/infoboard/preview");
  });

  it("pilot forbidden list — infoboard.manage no longer globally forbidden", () => {
    expect(PILOT_FORBIDDEN_PERMISSION_KEYS).not.toContain(PERMISSIONS.INFOBOARD_MANAGE);
    for (const forbidden of PILOT_FORBIDDEN_PERMISSION_KEYS) {
      expect(SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys).not.toContain(forbidden);
    }
  });
});
