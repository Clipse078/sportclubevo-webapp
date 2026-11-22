/**
 * SCE-NAV-DOCS-01 — Dokumente belongs under Club L1, not Kommunikation.
 */

import { describe, expect, it } from "vitest";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import {
  CLUB_DOMAIN_MAP_SUMMARY,
  CLUB_NAV_ITEM_TO_DOMAIN,
  buildNavigationDomainsFromSections,
} from "@/lib/nav/app-navigation-domains";
import {
  buildAppNavigationModelForUser,
  isDomainHeaderSecondaryItemActive,
  resolveActiveAppNavigation,
  resolveDomainSecondaryNavItems,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections, NAV_SECTIONS } from "@/lib/nav/nav-config";
import {
  CLUB_TARGET_L2_GROUPS,
  resolveClubWorkspaceNavItemDomainId,
} from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import { TENANT_DOCUMENTATION_HUB_ROUTE_PERMISSIONS } from "@/lib/tenant-documentation/tenant-documentation-route-permissions";

const WORKSPACE_USER: PermissionKey[] = [PERMISSIONS.WORKSPACE_VIEW];
const DOC_USER: PermissionKey[] = [PERMISSIONS.TENANT_DOCUMENTATION_VIEW];
const NO_WORKSPACE: PermissionKey[] = [PERMISSIONS.TEAMS_VIEW];
const CLUB_ADMIN: PermissionKey[] = Object.values(PERMISSIONS) as PermissionKey[];

function communicationDestinationKeys(permissionKeys: PermissionKey[]): string[] {
  const sections = getVisibleNavSections(permissionKeys, "club");
  const domains = buildNavigationDomainsFromSections(sections, "club");
  const communication = domains.find((d) => d.id === "communication");
  return communication?.destinations.map((d) => d.key) ?? [];
}

function clubDestinationKeys(permissionKeys: PermissionKey[]): string[] {
  const sections = getVisibleNavSections(permissionKeys, "club");
  const domains = buildNavigationDomainsFromSections(sections, "club");
  const club = domains.find((d) => d.id === "club");
  return club?.destinations.map((d) => d.key) ?? [];
}

function visibleTopLevelLabels(permissionKeys: PermissionKey[]): string[] {
  return getVisibleNavSections(permissionKeys, "club").flatMap((s) =>
    s.items.map((i) => i.label),
  );
}

describe("SCE-NAV-DOCS-01 club documents navigation", () => {
  it("A: Dokumente is not a Kommunikation domain destination", () => {
    expect(communicationDestinationKeys(CLUB_ADMIN)).not.toContain("workspace");
    expect(communicationDestinationKeys(WORKSPACE_USER)).not.toContain("workspace");
  });

  it("B: Dokumente is a Club domain destination", () => {
    expect(clubDestinationKeys(CLUB_ADMIN)).toContain("workspace");
    expect(clubDestinationKeys(WORKSPACE_USER)).toContain("workspace");
    expect(CLUB_NAV_ITEM_TO_DOMAIN.workspace).toBe("club");
    expect(resolveClubWorkspaceNavItemDomainId("workspace")).toBe("club");
  });

  it("C: eligible workspace user sees Dokumente exactly once in nav labels", () => {
    const labels = visibleTopLevelLabels(WORKSPACE_USER);
    expect(labels.filter((l) => l === "Dokumente")).toHaveLength(1);
  });

  it("D: ineligible user does not gain Dokumente via Club placement", () => {
    expect(visibleTopLevelLabels(NO_WORKSPACE)).not.toContain("Dokumente");
    expect(clubDestinationKeys(NO_WORKSPACE)).not.toContain("workspace");
  });

  it("E2: Dokumentation nav permission keys match hub route contract", () => {
    const docItem = NAV_SECTIONS.flatMap((s) => s.items).find(
      (i) => i.key === "tenant-documentation",
    );
    expect(docItem?.permissionKeys).toEqual([...TENANT_DOCUMENTATION_HUB_ROUTE_PERMISSIONS]);
  });

  it("E: canonical Dokumente route unchanged", () => {
    const workspaceItem = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.key === "workspace");
    expect(workspaceItem?.href).toBe("/dashboard/workspace");
    expect(workspaceItem?.permissionKeys).toEqual([
      PERMISSIONS.WORKSPACE_VIEW,
      PERMISSIONS.WORKSPACE_MANAGE,
    ]);
  });

  it("F: active-state grouping resolves to Club for workspace routes", () => {
    const model = buildAppNavigationModelForUser(WORKSPACE_USER, "club");
    const routes = [
      "/dashboard/workspace",
      "/dashboard/workspace/audit",
      "/dashboard/workspace/governance/break-glass",
    ];
    for (const pathname of routes) {
      const active = resolveActiveAppNavigation(pathname, model);
      expect(active.activeDomainId, pathname).toBe("club");
      expect(active.activeDestinationKey, pathname).toBe("workspace");
    }
  });

  it("G: desktop and mobile share one canonical domain map", () => {
    expect(CLUB_DOMAIN_MAP_SUMMARY.communication).not.toContain("workspace");
    expect(CLUB_DOMAIN_MAP_SUMMARY.club).toContain("workspace");
  });

  it("H: no duplicate Dokumente nav item for club admin", () => {
    const labels = visibleTopLevelLabels(CLUB_ADMIN);
    expect(labels.filter((l) => l === "Dokumente")).toHaveLength(1);
  });

  it("I: Wissen & Unterlagen groups Dokumentation then Dokumente as Verein siblings", () => {
    expect(clubDestinationKeys(DOC_USER)).toContain("tenant-documentation");
    expect(CLUB_NAV_ITEM_TO_DOMAIN["tenant-documentation"]).toBe("club");
    expect(resolveClubWorkspaceNavItemDomainId("tenant-documentation")).toBe("club");

    const wissenGroup = CLUB_TARGET_L2_GROUPS.find((g) => g.id === "wissen-unterlagen");
    expect(wissenGroup?.label).toBe("Wissen & Unterlagen");
    expect(wissenGroup?.keys).toEqual(["tenant-documentation", "workspace"]);

    const docNav = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.key === "tenant-documentation");
    expect(docNav?.href).toBe("/dashboard/dokumentation");
    const workspaceNav = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.key === "workspace");
    expect(workspaceNav?.href).toBe("/dashboard/workspace");

    const model = buildAppNavigationModelForUser(
      [...DOC_USER, PERMISSIONS.WORKSPACE_VIEW],
      "club",
    );
    const clubDomain = model.domains.find((d) => d.id === "club")!;
    const secondary = resolveDomainSecondaryNavItems(clubDomain);
    const wissenItem = secondary.find((item) => item.headerGroupId === "wissen-unterlagen");
    expect(wissenItem?.label).toBe("Wissen & Unterlagen");

    const children = resolveSecondaryNavItemModuleLocalChildren(clubDomain, wissenItem!);
    expect(children.map((c) => c.key)).toEqual(["tenant-documentation", "workspace"]);
    expect(children.map((c) => c.label)).toEqual(["Dokumentation", "Dokumente"]);
    expect(children[0]?.href).toBe("/dashboard/dokumentation");
    expect(children[1]?.href).toBe("/dashboard/workspace");
  });

  it("J: mega-menu shows Wissen & Unterlagen when any child is accessible", () => {
    const docOnly = buildAppNavigationModelForUser(DOC_USER, "club");
    const clubDoc = docOnly.domains.find((d) => d.id === "club")!;
    expect(
      resolveDomainSecondaryNavItems(clubDoc).some((i) => i.headerGroupId === "wissen-unterlagen"),
    ).toBe(true);
    const docChildren = resolveSecondaryNavItemModuleLocalChildren(
      clubDoc,
      resolveDomainSecondaryNavItems(clubDoc).find((i) => i.headerGroupId === "wissen-unterlagen")!,
    );
    expect(docChildren.map((c) => c.key)).toEqual(["tenant-documentation"]);

    const filesOnly = buildAppNavigationModelForUser(WORKSPACE_USER, "club");
    const clubFiles = filesOnly.domains.find((d) => d.id === "club")!;
    const filesChildren = resolveSecondaryNavItemModuleLocalChildren(
      clubFiles,
      resolveDomainSecondaryNavItems(clubFiles).find((i) => i.headerGroupId === "wissen-unterlagen")!,
    );
    expect(filesChildren.map((c) => c.key)).toEqual(["workspace"]);

    const neither = buildAppNavigationModelForUser(NO_WORKSPACE, "club");
    const clubNeither = neither.domains.find((d) => d.id === "club")!;
    expect(
      resolveDomainSecondaryNavItems(clubNeither).some((i) => i.headerGroupId === "wissen-unterlagen"),
    ).toBe(false);
  });

  it("K: active-state highlights Wissen & Unterlagen on Dokumentation page routes", () => {
    const model = buildAppNavigationModelForUser(DOC_USER, "club");
    const clubDomain = model.domains.find((d) => d.id === "club")!;
    const routes = ["/dashboard/dokumentation", "/dashboard/dokumentation/p/sample-page-id"];
    for (const pathname of routes) {
      const active = resolveActiveAppNavigation(pathname, model);
      expect(active.activeDomainId, pathname).toBe("club");
      expect(active.activeDestinationKey, pathname).toBe("tenant-documentation");

      const wissenItem = resolveDomainSecondaryNavItems(clubDomain).find(
        (i) => i.headerGroupId === "wissen-unterlagen",
      )!;
      expect(
        isDomainHeaderSecondaryItemActive(
          pathname,
          clubDomain,
          wissenItem,
          active.activeDestinationKey,
          active.activeChildKey,
        ),
        pathname,
      ).toBe(true);
    }
  });

  it("L: user without documentation permission does not see Dokumentation destination", () => {
    expect(visibleTopLevelLabels(NO_WORKSPACE)).not.toContain("Dokumentation");
    expect(clubDestinationKeys(NO_WORKSPACE)).not.toContain("tenant-documentation");
  });
});
