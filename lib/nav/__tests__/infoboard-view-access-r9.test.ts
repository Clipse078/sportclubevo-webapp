import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import {
  PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE,
  SANDRA_FISCHER_SPIELBETRIEB_ROLE,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";

function collectHrefs(permissionKeys: readonly string[]) {
  return getVisibleNavSections([...permissionKeys]).flatMap((section) =>
    section.items.flatMap((item) => [item.href, ...(item.children?.map((child) => child.href) ?? [])]),
  );
}

describe("R9 — Infoboard view access (navigation)", () => {
  it("Sandra — Infoboard preview in nav, no manage permission in role template", () => {
    const keys = SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys;
    expect(keys).toContain(PERMISSIONS.INFOBOARD_VIEW);
    expect(keys).not.toContain(PERMISSIONS.INFOBOARD_MANAGE);
    expect(collectHrefs(keys)).toContain("/dashboard/infoboard/preview");
  });

  it("Patrick — same Infoboard preview discoverability as Sandra baseline", () => {
    const keys = PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.permissionKeys;
    expect(keys).toContain(PERMISSIONS.INFOBOARD_VIEW);
    expect(keys).not.toContain(PERMISSIONS.INFOBOARD_MANAGE);
    expect(collectHrefs(keys)).toContain("/dashboard/infoboard/preview");
  });

  it("Unauthorized custom role — no Infoboard nav without read permission", () => {
    const hrefs = collectHrefs([PERMISSIONS.TASKS_VIEW]);
    expect(hrefs).not.toContain("/dashboard/infoboard");
    expect(hrefs).not.toContain("/dashboard/infoboard/preview");
  });

  it("Club Admin contract still includes Infoboard manage path", () => {
    const hrefs = collectHrefs([PERMISSIONS.INFOBOARD_MANAGE]);
    expect(hrefs).toContain("/dashboard/infoboard");
    expect(hrefs).toContain("/dashboard/infoboard/preview");
  });
});
