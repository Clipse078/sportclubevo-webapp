import { describe, expect, it } from "vitest";
import { getNavIconKey } from "@/lib/motion/nav-icon-registry";
import { getVisibleNavSections, NAV_SECTIONS } from "@/lib/nav/nav-config";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

describe("SCE-SUPERADMIN-BILLING-01D — Commercial billing navigation", () => {
  it("shows Billing under Commercial for platform billing.view", () => {
    const sections = getVisibleNavSections([PERMISSIONS.BILLING_VIEW]);
    const commercial = sections.find((s) => s.sectionLabel === "Commercial");
    expect(commercial).toBeDefined();
    const item = commercial!.items.find((i) => i.key === "commercial");
    expect(item?.href).toBe("/dashboard/admin/commercial/billing");
    expect(item?.children?.some((c) => c.key === "commercial-billing")).toBe(true);
  });

  it("hides Commercial billing for tenant administration permissions only", () => {
    const sections = getVisibleNavSections(TENANT_ADMINISTRATION_PERMISSIONS);
    const flat = sections.flatMap((s) => s.items);
    expect(flat.some((i) => i.key === "commercial")).toBe(false);
  });

  it("defines Commercial as its own section, not under Administration", () => {
    const system = NAV_SECTIONS.find((s) => s.sectionLabel === "System");
    const adminChildren = system?.items.find((i) => i.key === "administration")?.children ?? [];
    expect(adminChildren.some((c) => c.href.includes("/commercial/billing"))).toBe(false);
  });

  it("resolves Commercial and Billing sidebar labels to animated nav icons", () => {
    expect(() => getNavIconKey("Commercial")).not.toThrow();
    expect(() => getNavIconKey("Billing")).not.toThrow();
    expect(getNavIconKey("Commercial")).toBe("commercial");
    expect(getNavIconKey("Billing")).toBe("billing");
  });
});
