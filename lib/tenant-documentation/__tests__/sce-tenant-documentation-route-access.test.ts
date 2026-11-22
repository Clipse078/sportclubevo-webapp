import { describe, expect, it } from "vitest";

import { NAV_SECTIONS, getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TENANT_DOCUMENTATION_HUB_ROUTE_PERMISSIONS } from "@/lib/tenant-documentation/tenant-documentation-route-permissions";

describe("tenant documentation nav ↔ route permission parity", () => {
  it("nav-config uses the canonical hub route permission bundle", () => {
    const docItem = NAV_SECTIONS.flatMap((s) => s.items).find(
      (i) => i.key === "tenant-documentation",
    );
    expect(docItem?.href).toBe("/dashboard/dokumentation");
    expect(docItem?.permissionKeys).toEqual([...TENANT_DOCUMENTATION_HUB_ROUTE_PERMISSIONS]);
  });

  it("reader sees Dokumentation exactly once", () => {
    const labels = getVisibleNavSections([PERMISSIONS.TENANT_DOCUMENTATION_VIEW], "club").flatMap(
      (s) => s.items.map((i) => i.label),
    );
    expect(labels.filter((l) => l === "Dokumentation")).toHaveLength(1);
  });

  it("unauthorized signed-in baseline hides Dokumentation", () => {
    const labels = getVisibleNavSections([PERMISSIONS.TASKS_VIEW], "club").flatMap((s) =>
      s.items.map((i) => i.label),
    );
    expect(labels).not.toContain("Dokumentation");
  });
});