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
  resolveActiveAppNavigation,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections, NAV_SECTIONS } from "@/lib/nav/nav-config";
import { resolveClubWorkspaceNavItemDomainId } from "@/lib/nav/nav-ia-v2/target-ia-matrix";

const WORKSPACE_USER: PermissionKey[] = [PERMISSIONS.WORKSPACE_VIEW];
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
});
