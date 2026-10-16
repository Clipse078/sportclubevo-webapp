/**
 * SCE-ACTIVITY-CREATE-01J-R5.2 — canonical desktop L1 domain order (order-only).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLUB_L1_DOMAIN_ORDER,
  NAVIGATION_DOMAIN_DEFINITIONS,
} from "@/lib/nav/app-navigation-domains";
import {
  buildAppNavigationModelForUser,
  resolveActiveAppNavigation,
  resolveDesktopPrimaryNavigationDomains,
  resolveDomainSecondaryNavItems,
} from "@/lib/nav/app-navigation-model";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);
const COMM_SENDER_ONLY = [
  PERMISSIONS.COMMUNICATION_CLUB_SEND,
  PERMISSIONS.COMMUNICATION_TEAM_SEND,
] as const;

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const EXPECTED_DESKTOP_L1_IDS = CLUB_L1_DOMAIN_ORDER.filter((id) => id !== "dashboard");

const EXPECTED_DESKTOP_L1_LABELS = EXPECTED_DESKTOP_L1_IDS.map(
  (id) => NAVIGATION_DOMAIN_DEFINITIONS[id].fallbackLabel,
);

describe("SCE-ACTIVITY-CREATE-01J-R5.2 canonical desktop L1 order", () => {
  it("defines desktop L1 order via NAVIGATION_DOMAIN_DEFINITIONS sortOrder (no CSS reorder)", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).not.toMatch(/flex-order\s*:\s*[1-9]/);
    expect(css).not.toMatch(/(?:^|[\s;{])order\s*:\s*[1-9]/m);

    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const desktop = resolveDesktopPrimaryNavigationDomains(model.domains, "club");
    expect(desktop.map((d) => d.id)).toEqual([...EXPECTED_DESKTOP_L1_IDS]);
    expect(desktop.map((d) => d.fallbackLabel)).toEqual(EXPECTED_DESKTOP_L1_LABELS);
  });

  it("places Club first and Admin last with exactly one occurrence per L1 domain", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const desktop = resolveDesktopPrimaryNavigationDomains(model.domains, "club");
    const ids = desktop.map((d) => d.id);
    expect(ids[0]).toBe("club");
    expect(ids.at(-1)).toBe("admin");
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("dashboard");
  });

  it("preserves active-domain resolution after reorder", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    expect(resolveActiveAppNavigation("/dashboard/teams/abc", model).activeDomainId).toBe("club");
    expect(resolveActiveAppNavigation("/dashboard/planner/week", model).activeDomainId).toBe(
      "planning",
    );
    expect(resolveActiveAppNavigation("/dashboard/website/news", model).activeDomainId).toBe(
      "publishing",
    );
    expect(
      resolveActiveAppNavigation("/dashboard/communication/mitteilungen", model).activeDomainId,
    ).toBe("communication");
    expect(resolveActiveAppNavigation("/dashboard/admin/branding", model).activeDomainId).toBe(
      "admin",
    );
  });

  it("preserves permission filtering (Admin hidden for communication-only sender)", () => {
    const model = buildAppNavigationModelForUser([...COMM_SENDER_ONLY], "club");
    const desktop = resolveDesktopPrimaryNavigationDomains(model.domains, "club");
    expect(desktop.map((d) => d.id)).not.toContain("admin");
    expect(desktop.some((d) => d.id === "communication")).toBe(true);
  });

  it("resolves domain-panel L2 items for each L1 domain after reorder", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const desktop = resolveDesktopPrimaryNavigationDomains(model.domains, "club");
    for (const domain of desktop) {
      const items = resolveDomainSecondaryNavItems(domain);
      if (domain.id === "planning") {
        expect(items.some((item) => item.key === "wochenplanner")).toBe(true);
      }
      if (domain.id === "club") {
        expect(items.length).toBeGreaterThan(0);
      }
      if (domain.id === "publishing") {
        expect(items.length).toBeGreaterThan(0);
      }
      if (domain.id === "admin") {
        expect(items.some((item) => item.key.startsWith("admin-"))).toBe(true);
      }
    }
  });
});
