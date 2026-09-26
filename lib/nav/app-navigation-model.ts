/**
 * SCE-VISUAL-03 / SCE-VISUAL-03R1 — canonical authenticated app navigation model.
 *
 * Permission-filtered NAV_SECTIONS destinations are grouped into semantic domains
 * for every responsive presentation (desktop primary row, contextual row, overflow, mobile).
 */

import type { NavItemChild } from "@/lib/nav/nav-config";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import type { NavCapabilityContext } from "@/lib/nav/nav-config";
import {
  buildNavigationDomainsFromSections,
  type NavigationDestination,
  type NavigationDomain,
  type AppNavigationDomainId,
  type NavPresentationPriority,
  NAVIGATION_DOMAIN_DEFINITIONS,
} from "@/lib/nav/app-navigation-domains";
import type { NavHeaderL2GroupDefinition } from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import type { NavSection } from "@/lib/nav/nav-config";
import type { PermissionKey } from "@/lib/permissions/permissions";
import type { WorkspaceContext } from "@/lib/workspace/workspace-context";

export type { NavPresentationPriority };

/** @deprecated Prefer {@link NavigationDomain} in new shell code. */
export type AppNavigationPrimaryItem = {
  key: string;
  label: string;
  href: string;
  priority: NavPresentationPriority;
  children?: NavItemChild[];
  carrySeason?: boolean;
};

export type AppNavigationModel = {
  domains: NavigationDomain[];
  /** Flattened destinations (permission-filtered); useful for route resolution tests. */
  destinations: NavigationDestination[];
};

export type DomainSecondaryNavItem = {
  key: string;
  label: string;
  href: string;
  carrySeason?: boolean;
  /** Promoted from a single hub destination (e.g. Planung → Wochenplaner…). */
  fromHubPromotion?: boolean;
  /** V2 header L2 group (Club / Publishing contextual row). */
  headerGroupId?: string;
  /** Nav-config keys represented by this header row entry (active-state resolution). */
  headerGroupNavKeys?: readonly string[];
};

export type ActiveAppNavigation = {
  activeDomainId: AppNavigationDomainId | null;
  activeDomain: NavigationDomain | null;
  activeDestinationKey: string | null;
  activeDestination: NavigationDestination | null;
  activeChildKey: string | null;
  /** Level-2 row: modules belonging to the active domain. */
  domainSecondaryItems: DomainSecondaryNavItem[];
  /** Level-3 row: module-local tabs for the active destination (when applicable). */
  moduleLocalChildren: NavItemChild[];
  /** @deprecated Use moduleLocalChildren */
  contextualChildren: NavItemChild[];
  /** @deprecated Use activeDomainId */
  activePrimaryKey: string | null;
  /** @deprecated Use activeDomain */
  activePrimary: AppNavigationPrimaryItem | null;
};

/** Domain with one top-level nav item whose children are the domain modules (Planung). */
export function isSingleHubNavigationDomain(domain: NavigationDomain): boolean {
  return (
    domain.destinations.length === 1 &&
    (domain.destinations[0]?.children?.length ?? 0) > 0
  );
}

function resolveNavKeyHrefInDomain(
  domain: NavigationDomain,
  navKey: string,
): { href: string; carrySeason?: boolean; itemKey: string } | null {
  const topLevel = domain.destinations.find((dest) => dest.key === navKey);
  if (topLevel) {
    return { href: topLevel.href, carrySeason: topLevel.carrySeason, itemKey: topLevel.key };
  }
  for (const dest of domain.destinations) {
    const child = dest.children?.find((c) => c.key === navKey);
    if (child) {
      return { href: child.href, carrySeason: dest.carrySeason, itemKey: child.key };
    }
  }
  return null;
}

function collectAuthorizedGroupNavKeys(
  domain: NavigationDomain,
  group: NavHeaderL2GroupDefinition,
): string[] {
  const keys = group.keys ?? [];
  return keys.filter((key) => resolveNavKeyHrefInDomain(domain, key) !== null);
}

function resolveHeaderItemsFromL2Groups(domain: NavigationDomain): DomainSecondaryNavItem[] {
  const groups = domain.l2GroupMetadata ?? [];
  const items: DomainSecondaryNavItem[] = [];

  for (const group of groups) {
    if (group.headerVisible === false) continue;
    const authorizedKeys = collectAuthorizedGroupNavKeys(domain, group);
    if (authorizedKeys.length === 0) continue;

    const representativeKey =
      authorizedKeys.find((key) => domain.destinations.some((dest) => dest.key === key)) ??
      authorizedKeys[0]!;
    const resolved = resolveNavKeyHrefInDomain(domain, representativeKey);
    if (!resolved) continue;

    items.push({
      key: resolved.itemKey,
      label: group.label,
      href: resolved.href,
      carrySeason: resolved.carrySeason,
      headerGroupId: group.id,
      headerGroupNavKeys: authorizedKeys,
    });
  }

  return items;
}

/** Permission-filtered header Row 2 items for the active domain (V2 contextual navigation). */
export function resolveDomainSecondaryNavItems(
  domain: NavigationDomain | null,
): DomainSecondaryNavItem[] {
  if (!domain) return [];

  if (domain.id === "dashboard") {
    return [];
  }

  if (isSingleHubNavigationDomain(domain)) {
    const hub = domain.destinations[0]!;
    return (hub.children ?? []).map((child) => ({
      key: child.key,
      label: child.label,
      href: child.href,
      fromHubPromotion: true,
    }));
  }

  if (domain.l2GroupMetadata?.length) {
    return resolveHeaderItemsFromL2Groups(domain);
  }

  return domain.destinations
    .filter((dest) => dest.visibility?.header !== false)
    .map((dest) => ({
      key: dest.key,
      label: dest.label,
      href: dest.href,
      carrySeason: dest.carrySeason,
    }));
}

/** Full module list for App Explorer (unfiltered by header Row 2 subset). */
export function resolveDomainExplorerModuleItems(
  domain: NavigationDomain | null,
): DomainSecondaryNavItem[] {
  if (!domain) return [];
  if (isSingleHubNavigationDomain(domain)) {
    const hub = domain.destinations[0]!;
    return (hub.children ?? []).map((child) => ({
      key: child.key,
      label: child.label,
      href: child.href,
      fromHubPromotion: true,
    }));
  }
  return domain.destinations.map((dest) => ({
    key: dest.key,
    label: dest.label,
    href: dest.href,
    carrySeason: dest.carrySeason,
  }));
}

export function isDomainHeaderSecondaryItemActive(
  pathname: string,
  domain: NavigationDomain,
  item: DomainSecondaryNavItem,
  activeDestinationKey: string | null,
): boolean {
  if (item.fromHubPromotion) {
    return isNavigationChildActive(pathname, {
      key: item.key,
      label: item.label,
      href: item.href,
    });
  }

  if (item.headerGroupNavKeys?.length) {
    return item.headerGroupNavKeys.some((navKey) => {
      const resolved = resolveNavKeyHrefInDomain(domain, navKey);
      if (!resolved) return false;
      if (navKey === activeDestinationKey) return true;
      return isNavigationHrefActive(pathname, resolved.href);
    });
  }

  const destination = domain.destinations.find((dest) => dest.key === item.key);
  if (!destination) return false;
  if (activeDestinationKey === destination.key) return true;
  return (
    isNavigationHrefActive(pathname, destination.href) ||
    (destination.children?.some((child) => isNavigationChildActive(pathname, child)) ?? false)
  );
}

export function resolveModuleLocalNavItems(
  domain: NavigationDomain | null,
  activeDestination: NavigationDestination | null,
): NavItemChild[] {
  if (!domain || !activeDestination?.children?.length) return [];
  if (isSingleHubNavigationDomain(domain)) return [];
  return activeDestination.children;
}

export function getDomainNavPriority(domainId: AppNavigationDomainId): NavPresentationPriority {
  return NAVIGATION_DOMAIN_DEFINITIONS[domainId]?.priority ?? 3;
}

/** @deprecated Use getDomainNavPriority */
export function getPrimaryNavPriority(navItemKey: string): NavPresentationPriority {
  if (navItemKey === "dashboard" || navItemKey === "planung" || navItemKey === "platform-dashboard") {
    return 1;
  }
  if (
    navItemKey === "communication" ||
    navItemKey === "platform-clubs" ||
    navItemKey === "platform-access" ||
    navItemKey === "platform-commercial"
  ) {
    return 2;
  }
  return 3;
}

export function buildAppNavigationModel(
  sections: NavSection[],
  workspaceContext: WorkspaceContext = "club",
): AppNavigationModel {
  const domains = buildNavigationDomainsFromSections(sections, workspaceContext);
  const destinations = domains.flatMap((d) => d.destinations);
  return { domains, destinations };
}

export function buildAppNavigationModelForUser(
  permissionKeys: PermissionKey[],
  workspaceContext: WorkspaceContext = "club",
  capabilities?: NavCapabilityContext,
): AppNavigationModel {
  return buildAppNavigationModel(
    getVisibleNavSections(permissionKeys, workspaceContext, capabilities),
    workspaceContext,
  );
}

export function isNavigationHrefActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

export function isNavigationChildActive(pathname: string, child: NavItemChild): boolean {
  if (child.matchExact) {
    return pathname === child.href;
  }
  return isNavigationHrefActive(pathname, child.href);
}

function domainToLegacyPrimary(domain: NavigationDomain): AppNavigationPrimaryItem {
  const dest = domain.defaultDestination;
  return {
    key: domain.id,
    label: domain.fallbackLabel,
    href: dest.href,
    priority: domain.priority,
    children: dest.children,
    carrySeason: dest.carrySeason,
  };
}

function resolveActiveDestination(
  pathname: string,
  domain: NavigationDomain,
): { destination: NavigationDestination; childKey: string | null } | null {
  for (const destination of domain.destinations) {
    if (isNavigationHrefActive(pathname, destination.href)) {
      const child = destination.children?.find((c) => isNavigationChildActive(pathname, c));
      return { destination, childKey: child?.key ?? null };
    }
    const child = destination.children?.find((c) => isNavigationChildActive(pathname, c));
    if (child) {
      return { destination, childKey: child.key };
    }
  }

  const prefixMatch = domain.destinations
    .filter(
      (dest) =>
        isNavigationHrefActive(pathname, dest.href) ||
        dest.children?.some((c) => isNavigationChildActive(pathname, c)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!prefixMatch) return null;
  const child = prefixMatch.children?.find((c) => isNavigationChildActive(pathname, c));
  return { destination: prefixMatch, childKey: child?.key ?? null };
}

export function resolveActiveAppNavigation(
  pathname: string,
  model: AppNavigationModel,
): ActiveAppNavigation {
  let activeDomain: NavigationDomain | null = null;
  let activeDestination: NavigationDestination | null = null;
  let activeChildKey: string | null = null;

  for (const domain of model.domains) {
    const match = resolveActiveDestination(pathname, domain);
    if (match) {
      activeDomain = domain;
      activeDestination = match.destination;
      activeChildKey = match.childKey;
      break;
    }
  }

  const domainSecondaryItems = resolveDomainSecondaryNavItems(activeDomain);
  const moduleLocalChildren = resolveModuleLocalNavItems(activeDomain, activeDestination);

  const legacyPrimary = activeDomain ? domainToLegacyPrimary(activeDomain) : null;

  return {
    activeDomainId: activeDomain?.id ?? null,
    activeDomain,
    activeDestinationKey: activeDestination?.key ?? null,
    activeDestination,
    activeChildKey,
    domainSecondaryItems,
    moduleLocalChildren,
    contextualChildren: moduleLocalChildren,
    activePrimaryKey: activeDomain?.id ?? null,
    activePrimary: legacyPrimary,
  };
}

export type CanonicalNavLeaf = {
  key: string;
  label: string;
  href: string;
  parentKey: string | null;
};

/** Every permission-visible navigable href from canonical NAV_SECTIONS (AdminSidebar parity). */
export function flattenVisibleCanonicalNavLeaves(sections: NavSection[]): CanonicalNavLeaf[] {
  const leaves: CanonicalNavLeaf[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      leaves.push({ key: item.key, label: item.label, href: item.href, parentKey: null });
      for (const child of item.children ?? []) {
        leaves.push({
          key: child.key,
          label: child.label,
          href: child.href,
          parentKey: item.key,
        });
      }
    }
  }
  return leaves;
}

function collectReachableKeysFromModel(model: AppNavigationModel): Set<string> {
  const keys = new Set<string>();
  for (const domain of model.domains) {
    keys.add(domain.id);
    for (const secondary of resolveDomainSecondaryNavItems(domain)) {
      keys.add(secondary.key);
    }
    for (const dest of domain.destinations) {
      keys.add(dest.key);
      for (const child of dest.children ?? []) {
        keys.add(child.key);
      }
    }
  }
  return keys;
}

export type NavigationCompletenessReport = {
  canonicalVisibleDestinations: number;
  reachableDestinations: number;
  orphanedDestinations: string[];
};

/**
 * Ensures every permission-visible canonical nav leaf remains reachable through the domain model
 * (primary domains, domain secondary row, module-local children, or global menu tree).
 */
export function auditNavigationCompleteness(
  sections: NavSection[],
  model: AppNavigationModel,
): NavigationCompletenessReport {
  const leaves = flattenVisibleCanonicalNavLeaves(sections);
  const reachable = collectReachableKeysFromModel(model);
  const orphaned = leaves.filter((leaf) => !reachable.has(leaf.key)).map((leaf) => leaf.key);
  return {
    canonicalVisibleDestinations: leaves.length,
    reachableDestinations: leaves.length - orphaned.length,
    orphanedDestinations: orphaned,
  };
}

export type PrimaryDomainPresentation = {
  inlineDomains: NavigationDomain[];
  overflowDomains: NavigationDomain[];
};

/**
 * Splits domains for the desktop primary row. Promotes the active domain into the inline set
 * when it would otherwise only appear under Mehr.
 */
export function resolvePrimaryDomainPresentation(
  domains: NavigationDomain[],
  activeDomainId: AppNavigationDomainId | null,
  maxInlineDomains: number,
): PrimaryDomainPresentation {
  if (domains.length <= maxInlineDomains) {
    return { inlineDomains: domains, overflowDomains: [] };
  }

  const sorted = [...domains].sort(
    (a, b) => a.priority - b.priority || a.sortOrder - b.sortOrder,
  );

  let inline = sorted.slice(0, maxInlineDomains);
  let overflow = sorted.slice(maxInlineDomains);

  if (activeDomainId && overflow.some((d) => d.id === activeDomainId)) {
    const active = overflow.find((d) => d.id === activeDomainId)!;
    const demotable = [...inline]
      .filter((d) => d.id !== activeDomainId)
      .sort((a, b) => b.priority - a.priority || b.sortOrder - a.sortOrder)[0];
    if (demotable) {
      inline = inline.filter((d) => d.id !== demotable.id);
      overflow = overflow.filter((d) => d.id !== activeDomainId);
      inline.push(active);
      overflow.push(demotable);
      inline.sort((a, b) => a.sortOrder - b.sortOrder);
      overflow.sort((a, b) => a.sortOrder - b.sortOrder);
    }
  }

  return { inlineDomains: inline, overflowDomains: overflow };
}

export function selectMobileBottomDomains(
  model: AppNavigationModel,
  activeDomainId: AppNavigationDomainId | null,
  maxItems = 3,
): NavigationDomain[] {
  const byPriority = [...model.domains].sort(
    (a, b) => a.priority - b.priority || a.sortOrder - b.sortOrder,
  );
  const picked: NavigationDomain[] = [];
  for (const domain of byPriority) {
    if (picked.length >= maxItems) break;
    picked.push(domain);
  }
  if (activeDomainId && !picked.some((d) => d.id === activeDomainId)) {
    const active = model.domains.find((d) => d.id === activeDomainId);
    if (active && picked.length >= maxItems) {
      picked[picked.length - 1] = active;
    } else if (active) {
      picked.push(active);
    }
  }
  return picked.slice(0, maxItems);
}

/** @deprecated Use selectMobileBottomDomains */
export function selectMobileBottomPrimaryItems(
  model: AppNavigationModel,
  activePrimaryKey: string | null,
  maxItems = 3,
): AppNavigationPrimaryItem[] {
  return selectMobileBottomDomains(model, activePrimaryKey as AppNavigationDomainId | null, maxItems).map(
    domainToLegacyPrimary,
  );
}

export const SEASON_CARRY_PREFIXES = [
  "/dashboard",
  "/dashboard/seasons",
  "/dashboard/planner",
  "/dashboard/teams",
  "/dashboard/events",
] as const;

export function shouldCarrySeasonQuery(href: string): boolean {
  return SEASON_CARRY_PREFIXES.some(
    (prefix) =>
      href === prefix ||
      href.startsWith(`${prefix}/`) ||
      href.startsWith(`${prefix}?`),
  );
}

export function buildNavigationHref(baseHref: string, season: string | null): string {
  if (!season || !shouldCarrySeasonQuery(baseHref)) return baseHref;
  return `${baseHref}?season=${encodeURIComponent(season)}`;
}
