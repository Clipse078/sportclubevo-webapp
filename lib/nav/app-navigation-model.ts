/**
 * SCE-VISUAL-03 — canonical authenticated app navigation model.
 *
 * One permission-filtered tree from {@link getVisibleNavSections} drives every
 * responsive presentation (desktop primary row, contextual row, overflow, mobile).
 */

import type { NavItem, NavItemChild, NavSection } from "@/lib/nav/nav-config";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import type { NavCapabilityContext } from "@/lib/nav/nav-config";
import type { PermissionKey } from "@/lib/permissions/permissions";
import type { WorkspaceContext } from "@/lib/workspace/workspace-context";

export type NavPresentationPriority = 1 | 2 | 3;

export type AppNavigationPrimaryItem = {
  key: string;
  label: string;
  href: string;
  priority: NavPresentationPriority;
  children?: NavItemChild[];
  carrySeason?: boolean;
};

export type AppNavigationModel = {
  primaryItems: AppNavigationPrimaryItem[];
};

export type ActiveAppNavigation = {
  activePrimaryKey: string | null;
  activePrimary: AppNavigationPrimaryItem | null;
  activeChildKey: string | null;
  contextualChildren: NavItemChild[];
};

const PRIMARY_NAV_PRIORITY: Record<string, NavPresentationPriority> = {
  dashboard: 1,
  "platform-dashboard": 1,
  planung: 1,
  aufgaben: 1,
  organisation: 2,
  mitglieder: 2,
  anmeldungen: 2,
  communication: 2,
  workspace: 2,
  teams: 2,
  helfereinsaetze: 3,
  website: 3,
  infoboard: 3,
  "trainer-staff": 3,
  meetings: 3,
  "club-entwicklung": 3,
  material: 3,
  finanzen: 3,
  sponsoring: 3,
  "formulare-freigaben": 3,
  "vorfaelle-disziplin": 3,
  administration: 3,
  "platform-clubs": 2,
  "platform-commercial": 2,
  "platform-integrations": 3,
  "platform-access": 2,
  "platform-operations": 3,
};

const DEFAULT_PRIORITY: NavPresentationPriority = 3;

export function getPrimaryNavPriority(navItemKey: string): NavPresentationPriority {
  return PRIMARY_NAV_PRIORITY[navItemKey] ?? DEFAULT_PRIORITY;
}

export function buildAppNavigationModel(sections: NavSection[]): AppNavigationModel {
  const primaryItems: AppNavigationPrimaryItem[] = sections.flatMap((section) =>
    section.items.map((item) => mapNavItemToPrimary(item)),
  );
  return { primaryItems };
}

function mapNavItemToPrimary(item: NavItem): AppNavigationPrimaryItem {
  return {
    key: item.key,
    label: item.label,
    href: item.href,
    priority: getPrimaryNavPriority(item.key),
    children: item.children,
    carrySeason: item.carrySeason,
  };
}

export function buildAppNavigationModelForUser(
  permissionKeys: PermissionKey[],
  workspaceContext: WorkspaceContext = "club",
  capabilities?: NavCapabilityContext,
): AppNavigationModel {
  return buildAppNavigationModel(
    getVisibleNavSections(permissionKeys, workspaceContext, capabilities),
  );
}

export function isNavigationHrefActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

export function isNavigationChildActive(
  pathname: string,
  child: NavItemChild,
): boolean {
  if (child.matchExact) {
    return pathname === child.href;
  }
  return isNavigationHrefActive(pathname, child.href);
}

export function resolveActiveAppNavigation(
  pathname: string,
  model: AppNavigationModel,
): ActiveAppNavigation {
  let activePrimary: AppNavigationPrimaryItem | null = null;
  let activeChildKey: string | null = null;

  for (const primary of model.primaryItems) {
    if (isNavigationHrefActive(pathname, primary.href)) {
      activePrimary = primary;
      const child = primary.children?.find((c) => isNavigationChildActive(pathname, c));
      activeChildKey = child?.key ?? null;
      break;
    }
    const child = primary.children?.find((c) => isNavigationChildActive(pathname, c));
    if (child) {
      activePrimary = primary;
      activeChildKey = child.key;
      break;
    }
  }

  if (!activePrimary) {
    const prefixMatch = model.primaryItems
      .filter(
        (item) =>
          pathname.startsWith(item.href) ||
          item.children?.some((c) => pathname.startsWith(c.href)),
      )
      .sort((a, b) => b.href.length - a.href.length)[0];
    if (prefixMatch) {
      activePrimary = prefixMatch;
      const child = prefixMatch.children?.find((c) => isNavigationChildActive(pathname, c));
      activeChildKey = child?.key ?? null;
    }
  }

  const contextualChildren = activePrimary?.children ?? [];

  return {
    activePrimaryKey: activePrimary?.key ?? null,
    activePrimary,
    activeChildKey,
    contextualChildren,
  };
}

/** Mobile bottom bar: highest-value primaries (same model, capped). */
export function selectMobileBottomPrimaryItems(
  model: AppNavigationModel,
  activePrimaryKey: string | null,
  maxItems = 3,
): AppNavigationPrimaryItem[] {
  const byPriority = [...model.primaryItems].sort(
    (a, b) => a.priority - b.priority || a.label.localeCompare(b.label),
  );
  const picked: AppNavigationPrimaryItem[] = [];
  for (const item of byPriority) {
    if (picked.length >= maxItems) break;
    picked.push(item);
  }
  if (activePrimaryKey && !picked.some((p) => p.key === activePrimaryKey)) {
    const active = model.primaryItems.find((p) => p.key === activePrimaryKey);
    if (active && picked.length >= maxItems) {
      picked[picked.length - 1] = active;
    } else if (active) {
      picked.push(active);
    }
  }
  return picked.slice(0, maxItems);
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
