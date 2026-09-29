/**
 * @vitest-environment jsdom
 * SCE-NAV-ADMIN-01 — Club Admin primary navigation & Admin Hub
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import {
  buildAppNavigationModelForUser,
  resolveActiveAppNavigation,
  selectMobileBottomDomains,
} from "@/lib/nav/app-navigation-model";
import { CLUB_L1_DOMAIN_ORDER } from "@/lib/nav/app-navigation-domains";
import { ADMIN_HUB_CARD_CATALOG, buildAdminHubGroupsForUser } from "@/lib/nav/admin-hub-catalog";
import { resolveAdminAreaRoutePermissionKeys } from "@/lib/permissions/admin-area-route-access";
import { hasTenantAdministrationAccess } from "@/lib/permissions/has-tenant-administration-access";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      "domains.dashboard": "Dashboard",
      "domains.planning": "Planung",
      "domains.communication": "Kommunikation",
      "domains.club": "Club",
      "domains.publishing": "Publizieren",
      "domains.admin": "Admin",
      primaryNavAria: "Hauptnavigation",
      mobilePrimaryNavAria: "Mobile Hauptnavigation",
      more: "Mehr",
      moreNavAria: "Weitere Navigation",
      openDrawer: "Navigation öffnen",
    };
    return labels[key] ?? key;
  },
}));

vi.mock("@/components/admin/branding/SidebarPlatformBrand", () => ({
  default: () => <div data-testid="sce-brand" />,
}));

vi.mock("@/components/admin/layout/HeaderTenantIdentity", () => ({
  default: ({ tenantName }: { tenantName: string }) => (
    <div data-testid="tenant-identity">{tenantName}</div>
  ),
}));

vi.mock("@/components/admin/layout/AdminPageActions", () => ({
  default: () => null,
}));

vi.mock("@/components/admin/notifications/NotificationBell", () => ({
  default: () => null,
}));

vi.mock("@/components/admin/layout/AccountMenu", () => ({
  default: () => null,
}));

vi.mock("@/lib/nav/use-primary-nav-layout-tier", () => ({
  usePrimaryNavLayoutTier: () => "desktop",
  maxInlineDomainsForTier: () => 8,
}));

const CLUB_ADMIN_KEYS: PermissionKey[] = [
  PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_INVITE,
  PERMISSIONS.ROLES_VIEW,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.FACILITIES_VIEW,
  PERMISSIONS.COMMUNICATION_CLUB_SEND,
  PERMISSIONS.TRAININGS_VIEW,
  PERMISSIONS.WEBSITE_MANAGE,
  PERMISSIONS.TEAMS_VIEW,
];

const COMM_SENDER_ONLY: PermissionKey[] = [
  PERMISSIONS.COMMUNICATION_CLUB_SEND,
  PERMISSIONS.COMMUNICATION_TEAM_SEND,
];

const COACH_KEYS: PermissionKey[] = [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.TEAMS_VIEW];

function readAdminHubPageSource(): string {
  return readFileSync(
    join(process.cwd(), "app/(admin)/dashboard/admin/page.tsx"),
    "utf8",
  );
}

function domainLabelsFromNav(permissionKeys: PermissionKey[]): string[] {
  const model = buildAppNavigationModelForUser(permissionKeys, "club");
  return model.domains
    .filter((d) => CLUB_L1_DOMAIN_ORDER.includes(d.id as (typeof CLUB_L1_DOMAIN_ORDER)[number]))
    .map((d) => d.fallbackLabel);
}

describe("SCE-NAV-ADMIN-01 Club Admin navigation", () => {
  it("uses users.manage_memberships as canonical tenant Club Admin capability", () => {
    expect(TENANT_ADMINISTRATION_PERMISSIONS).toEqual([PERMISSIONS.USERS_MANAGE_MEMBERSHIPS]);
    expect(hasTenantAdministrationAccess(CLUB_ADMIN_KEYS)).toBe(true);
    expect(hasTenantAdministrationAccess(COMM_SENDER_ONLY)).toBe(false);
    expect(hasTenantAdministrationAccess(COACH_KEYS)).toBe(false);
  });

  it("shows Admin after Publizieren for Club Admin in desktop primary navigation", () => {
    render(
      <AppShellNavigation
        permissionKeys={CLUB_ADMIN_KEYS}
        workspaceContext="club"
        clubName="Test Club"
        firstName="Club"
        lastName="Admin"
        email="admin@test.example"
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    const labels = Array.from(nav.querySelectorAll(".sce-global-primary-nav-domain-label")).map(
      (el) => el.textContent,
    );
    expect(labels.indexOf("Admin")).toBe(labels.indexOf("Publizieren") + 1);
    expect(labels.at(-1)).toBe("Admin");
    expect(screen.getByRole("link", { name: /^Admin$/ })).toHaveAttribute("href", "/dashboard/admin");
  });

  it("hides Admin for non-Club-Admin and communication-only senders", () => {
    for (const keys of [COMM_SENDER_ONLY, COACH_KEYS]) {
      render(
        <AppShellNavigation
          permissionKeys={keys}
          workspaceContext="club"
          clubName="Test Club"
          firstName="Test"
          lastName="User"
          email="user@test.example"
        />,
      );
      expect(screen.queryByRole("link", { name: /^Admin$/ })).not.toBeInTheDocument();
    }
  });

  it("includes Admin in mobile bottom navigation candidates for Club Admin", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const bottom = selectMobileBottomDomains(model, null, 5);
    expect(bottom.some((d) => d.id === "admin")).toBe(true);
    expect(domainLabelsFromNav(COMM_SENDER_ONLY)).not.toContain("Admin");
  });

  it("resolves Admin active state for /dashboard/admin and child routes", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    for (const path of [
      "/dashboard/admin",
      "/dashboard/admin/people-access",
      "/dashboard/admin/facilities",
    ]) {
      const active = resolveActiveAppNavigation(path, model);
      expect(active.activeDomainId).toBe("admin");
    }
  });

  it("gates /dashboard/admin child routes with tenant administration by default", () => {
    expect(resolveAdminAreaRoutePermissionKeys("/dashboard/admin")).toEqual(
      TENANT_ADMINISTRATION_PERMISSIONS,
    );
    expect(resolveAdminAreaRoutePermissionKeys("/dashboard/admin/people-access")).toEqual(
      TENANT_ADMINISTRATION_PERMISSIONS,
    );
    expect(resolveAdminAreaRoutePermissionKeys("/dashboard/admin/commercial/billing")).toContain(
      PERMISSIONS.BILLING_VIEW,
    );
    expect(resolveAdminAreaRoutePermissionKeys("/dashboard/admin/tenants")).toContain(
      PERMISSIONS.TENANTS_VIEW,
    );
  });

  it("Admin Hub links only to existing production routes (no platform tenants card)", () => {
    const groups = buildAdminHubGroupsForUser(CLUB_ADMIN_KEYS);
    const hrefs = groups.flatMap((g) => g.cards.map((c) => c.href));
    expect(hrefs).toContain("/dashboard/admin/people-access");
    expect(hrefs).not.toContain("/dashboard/admin/tenants");
    for (const href of hrefs) {
      const catalog = ADMIN_HUB_CARD_CATALOG.find((c) => c.href === href);
      expect(catalog).toBeDefined();
    }
  });

  it("Admin Hub page requires tenant administration", () => {
    const source = readAdminHubPageSource();
    expect(source).toContain("requireTenantAdministration");
  });
});
