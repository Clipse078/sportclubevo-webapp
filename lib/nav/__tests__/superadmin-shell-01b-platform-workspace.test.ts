/**
 * SCE-SUPERADMIN-SHELL-01B — platform workspace navigation and routing helpers.
 */

import { describe, expect, it } from "vitest";
import { getNavIconKey } from "@/lib/motion/nav-icon-registry";
import { flattenNavSections, getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const PLATFORM_SUPERADMIN_KEYS = [
  PERMISSIONS.TENANTS_VIEW,
  PERMISSIONS.TENANTS_MANAGE,
  PERMISSIONS.BILLING_VIEW,
  PERMISSIONS.USERS_MANAGE,
] as const;

function platformLabels(permissionKeys: (typeof PLATFORM_SUPERADMIN_KEYS)[number][]) {
  return flattenNavSections(getVisibleNavSections([...permissionKeys], "platform")).map(
    (item) => item.label,
  );
}

describe("SCE-SUPERADMIN-SHELL-01B — platform superadmin navigation", () => {
  const labels = platformLabels([...PLATFORM_SUPERADMIN_KEYS]);

  it("shows platform dashboard, clubs, commercial billing, integrations, and operations", () => {
    expect(labels).toContain("Platform Dashboard");
    expect(labels).toContain("Clubs");
    expect(labels).toContain("Commercial");
    expect(labels).toContain("Billing");
    expect(labels).toContain("Integrations");
    expect(labels).toContain("Operations");
  });

  it("hides club operational modules for platform workspace", () => {
    const hidden = [
      "Mitglieder",
      "Aufgaben",
      "Kommunikation",
      "Trainer & Staff",
      "Meetings",
      "Club Entwicklung",
      "Material & Inventar",
      "Finanzen",
      "Sponsoring",
      "Formulare & Freigaben",
      "Vorfälle & Disziplin",
    ];
    for (const label of hidden) {
      expect(labels).not.toContain(label);
    }
  });

  it("gates Clubs on tenants permissions", () => {
    const withoutTenants = platformLabels([PERMISSIONS.USERS_MANAGE]);
    expect(withoutTenants).not.toContain("Clubs");
    expect(withoutTenants).toContain("Platform Dashboard");
  });

  it("gates Commercial on billing.view", () => {
    const withoutBilling = platformLabels([
      PERMISSIONS.TENANTS_VIEW,
      PERMISSIONS.USERS_MANAGE,
    ]);
    expect(withoutBilling).not.toContain("Commercial");
    expect(withoutBilling).not.toContain("Billing");
  });

  it("gates Integrations on tenants.manage", () => {
    const viewOnly = platformLabels([PERMISSIONS.TENANTS_VIEW]);
    expect(viewOnly).not.toContain("Integrations");
  });

  it("resolves new platform nav labels through the animated icon registry", () => {
    for (const label of [
      "Platform Dashboard",
      "Clubs",
      "Access & Security",
      "Operations",
      "Berechtigungen",
    ]) {
      expect(() => getNavIconKey(label)).not.toThrow();
    }
  });
});

describe("SCE-SUPERADMIN-SHELL-01B — club navigation regression", () => {
  it("keeps club dashboard and does not leak platform-only entries", () => {
    const clubLabels = flattenNavSections(
      getVisibleNavSections([PERMISSIONS.USERS_MANAGE_MEMBERSHIPS], "club"),
    ).map((item) => item.label);

    expect(clubLabels).toContain("Dashboard");
    expect(clubLabels).not.toContain("Platform Dashboard");
    expect(clubLabels).not.toContain("Clubs");
    expect(clubLabels).not.toContain("Operations");
  });

  it("does not show Commercial in club workspace even with billing.view", () => {
    const clubLabels = flattenNavSections(
      getVisibleNavSections([PERMISSIONS.BILLING_VIEW], "club"),
    ).map((item) => item.label);
    expect(clubLabels).not.toContain("Commercial");
  });
});
