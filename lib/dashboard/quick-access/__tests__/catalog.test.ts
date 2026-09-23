import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildQuickAccessCatalog } from "../build-catalog";
import { navigationStableKey } from "../constants";

describe("DASHBOARD-04 — quick access catalog", () => {
  it("derives navigation entries from visible nav sections without duplicating permission logic", () => {
    const catalog = buildQuickAccessCatalog({
      permissionKeys: [PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE],
      navCapabilities: { personalActionsModule: false },
    });

    const navKeys = catalog.filter((e) => e.kind === "NAVIGATION").map((e) => e.key);
    expect(navKeys).toContain(navigationStableKey("matchcenter"));
    expect(navKeys).not.toContain(navigationStableKey("dashboard"));
  });

  it("includes create actions only when manage permissions allow creation", () => {
    const viewOnly = buildQuickAccessCatalog({
      permissionKeys: [PERMISSIONS.EVENTS_VIEW],
      navCapabilities: { personalActionsModule: false },
    });
    expect(viewOnly.some((e) => e.key === "action.create-match")).toBe(false);

    const manage = buildQuickAccessCatalog({
      permissionKeys: [PERMISSIONS.EVENTS_MANAGE],
      navCapabilities: { personalActionsModule: false },
    });
    expect(manage.some((e) => e.key === "action.create-match")).toBe(true);
  });

  it("exposes aufgaben via personal actions nav fallback capability", () => {
    const without = buildQuickAccessCatalog({
      permissionKeys: [],
      navCapabilities: { personalActionsModule: false },
    });
    expect(without.some((e) => e.key === navigationStableKey("aufgaben"))).toBe(false);

    const withPersonal = buildQuickAccessCatalog({
      permissionKeys: [],
      navCapabilities: { personalActionsModule: true },
    });
    expect(withPersonal.some((e) => e.key === navigationStableKey("aufgaben"))).toBe(true);
  });
});
