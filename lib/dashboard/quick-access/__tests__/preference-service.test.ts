import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuickAccessCatalogEntry } from "../types";
import { resolveVisibleQuickAccessKeys } from "../preference-service";

const catalog: QuickAccessCatalogEntry[] = [
  {
    key: "navigation.aufgaben",
    kind: "NAVIGATION",
    href: "/dashboard/aufgaben",
    iconLabel: "Aufgaben",
    messageKey: "x",
    permissionKeys: [],
    defaultPriority: 1,
  },
  {
    key: "navigation.personen",
    kind: "NAVIGATION",
    href: "/dashboard/persons",
    iconLabel: "Personen",
    messageKey: "x",
    permissionKeys: [],
    defaultPriority: 2,
  },
];

describe("DASHBOARD-04 — preference resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses defaults when no preference row exists", () => {
    const keys = resolveVisibleQuickAccessKeys({
      catalog,
      storedPinnedKeys: [],
      hasStoredPreference: false,
      personalContext: null,
    });
    expect(keys.length).toBeGreaterThan(0);
  });

  it("preserves stored order for authorized keys and drops inaccessible pins", () => {
    const keys = resolveVisibleQuickAccessKeys({
      catalog,
      storedPinnedKeys: ["navigation.personen", "navigation.removed", "navigation.aufgaben"],
      hasStoredPreference: true,
      personalContext: null,
    });
    expect(keys).toEqual(["navigation.personen", "navigation.aufgaben"]);
  });

  it("does not grant access through stored pins — unauthorized entries never appear", () => {
    const keys = resolveVisibleQuickAccessKeys({
      catalog: catalog.filter((e) => e.key === "navigation.aufgaben"),
      storedPinnedKeys: ["navigation.personen"],
      hasStoredPreference: true,
      personalContext: null,
    });
    expect(keys).not.toContain("navigation.personen");
    expect(keys).toEqual(["navigation.aufgaben"]);
  });
});
