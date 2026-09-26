/**
 * SCE-NAV-IA-V2-01 — derive current-state inventory from canonical nav-config + domain model.
 */

import { resolveNavItemDomainId } from "@/lib/nav/app-navigation-domains";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
  flattenVisibleCanonicalNavLeaves,
  resolveDomainSecondaryNavItems,
} from "@/lib/nav/app-navigation-model";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
import {
  NAV_SECTIONS,
  getVisibleNavSections,
  type NavItem,
  type NavItemChild,
} from "@/lib/nav/nav-config";
import type { PermissionKey } from "@/lib/permissions/permissions";
import type {
  CurrentNavInventoryRecord,
  NavDestinationClassification,
  NavigationCompletenessBaseline,
} from "@/lib/nav/nav-ia-v2/types";
import {
  scanAuthenticatedStaticRoutes,
  summarizeUnregisteredRoutes,
} from "@/lib/nav/nav-ia-v2/scan-authenticated-routes";
import { buildTargetIaRecord } from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import type { TargetIaRecord } from "@/lib/nav/nav-ia-v2/types";

function classifyNavKey(key: string, parentKey: string | null): NavDestinationClassification {
  if (key.startsWith("platform-")) {
    return key.includes("operations") ? "ADMIN_DESTINATION" : "PRIMARY_DESTINATION";
  }
  if (key === "dashboard") return "PRIMARY_DESTINATION";
  if (parentKey) return "LOCAL_DESTINATION";
  if (key === "administration" || key.startsWith("admin-")) return "ADMIN_DESTINATION";
  return "SECONDARY_DESTINATION";
}

function buildRecord(
  item: NavItem | NavItemChild,
  parent: NavItem | null,
  workspace: "club" | "platform",
  permissionKeys: PermissionKey[],
  domainSecondaryKeys: Set<string>,
): CurrentNavInventoryRecord {
  const key = item.key;
  const parentKey = parent?.key ?? null;
  const topLevelKey = parent?.key ?? key;
  const currentL1 = resolveNavItemDomainId(topLevelKey, workspace);

  let currentL2: string | null = null;
  if (parent) {
    currentL2 = parent.label;
  } else if (domainSecondaryKeys.has(key)) {
    currentL2 = key;
  }

  const isTopLevelModule = parent === null;
  const visibleInHeader = isTopLevelModule || domainSecondaryKeys.has(key);
  const visibleInExplorer = true;

  return {
    key,
    label: item.label,
    route: item.href,
    currentL1,
    currentL2,
    currentLocalGroup: parentKey,
    icon: getNavDestinationSceIconName(key),
    permissionKeys: item.permissionKeys,
    roleAudienceNote: item.permissionKeys?.length ? null : "navContexts / capability fallback",
    visibleInHeader,
    visibleInExplorer,
    mobileVisibility: visibleInHeader,
    parentKey,
    owner: "nav-config.ts",
    classification: classifyNavKey(key, parentKey),
    workspace,
  };
}

export function buildCurrentInventoryForPermissions(
  permissionKeys: PermissionKey[],
  workspace: "club" | "platform" = "club",
): CurrentNavInventoryRecord[] {
  const sections = getVisibleNavSections(permissionKeys, workspace);
  const model = buildAppNavigationModelForUser(permissionKeys, workspace);
  const domainSecondaryKeys = new Set(
    model.domains.flatMap((domain) => resolveDomainSecondaryNavItems(domain).map((d) => d.key)),
  );

  const records: CurrentNavInventoryRecord[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      records.push(buildRecord(item, null, workspace, permissionKeys, domainSecondaryKeys));
      for (const child of item.children ?? []) {
        records.push(buildRecord(child, item, workspace, permissionKeys, domainSecondaryKeys));
      }
    }
  }
  return records;
}

export function buildTargetMatrixFromInventory(
  inventory: CurrentNavInventoryRecord[],
): TargetIaRecord[] {
  return inventory.map((row) =>
    buildTargetIaRecord({
      key: row.key,
      label: row.label,
      route: row.route,
      currentL1: row.currentL1,
      parentKey: row.parentKey,
      permissionKeys: row.permissionKeys,
      classification: row.classification,
      workspace: row.workspace,
      visibleInHeader: row.visibleInHeader,
      visibleInExplorer: row.visibleInExplorer,
      mobileEligible: row.mobileVisibility,
    }),
  );
}

export function computeCompletenessBaseline(
  permissionKeys: PermissionKey[],
  workspace: "club" | "platform" = "club",
): NavigationCompletenessBaseline {
  const sections = getVisibleNavSections(permissionKeys, workspace);
  const model = buildAppNavigationModelForUser(permissionKeys, workspace);
  const report = auditNavigationCompleteness(sections, model);
  const leaves = flattenVisibleCanonicalNavLeaves(sections);

  const hrefCounts = new Map<string, string[]>();
  for (const leaf of leaves) {
    const list = hrefCounts.get(leaf.href) ?? [];
    list.push(leaf.key);
    hrefCounts.set(leaf.href, list);
  }
  const duplicateDestinations = [...hrefCounts.entries()]
    .filter(([, keys]) => keys.length > 1)
    .flatMap(([href, keys]) => keys.map((key) => `${key}→${href}`));

  const registeredHrefs = leaves.map((l) => l.href);
  const staticRoutes = scanAuthenticatedStaticRoutes();
  const unregisteredAuthenticatedRoutes = summarizeUnregisteredRoutes(
    staticRoutes,
    registeredHrefs,
  );

  return {
    authenticatedRoutePatterns: staticRoutes.length,
    navDestinations: NAV_SECTIONS.flatMap((s) =>
      s.items.flatMap((i) => [i.key, ...(i.children?.map((c) => c.key) ?? [])]),
    ).length,
    visibleDestinations: leaves.length,
    reachableDestinations: report.reachableDestinations,
    orphanedDestinations: report.orphanedDestinations,
    duplicateDestinations,
    unregisteredAuthenticatedRoutes,
  };
}
