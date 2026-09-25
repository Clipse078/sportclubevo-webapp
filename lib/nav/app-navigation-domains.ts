/**
 * SCE-VISUAL-03R1 — semantic navigation domains above canonical NAV_SECTIONS destinations.
 *
 * Route permissions and labels remain on {@link NavItem} entries in nav-config;
 * this file only defines grouping for shell presentation.
 */

import type { NavItem, NavSection } from "@/lib/nav/nav-config";

export type NavPresentationPriority = 1 | 2 | 3;

export type AppNavigationDomainId =
  | "dashboard"
  | "planning"
  | "organisation"
  | "communication"
  | "club"
  | "platform-overview"
  | "platform-governance"
  | "platform-commercial"
  | "platform-operations";

export type NavigationDestination = {
  /** Canonical nav-config item key. */
  key: string;
  label: string;
  href: string;
  carrySeason?: boolean;
  children?: NavItem["children"];
};

export type NavigationDomain = {
  id: AppNavigationDomainId;
  labelKey: string;
  /** Product label when i18n is unavailable (German product copy). */
  fallbackLabel: string;
  priority: NavPresentationPriority;
  sortOrder: number;
  defaultDestination: NavigationDestination;
  destinations: NavigationDestination[];
};

type DomainDefinition = {
  labelKey: string;
  fallbackLabel: string;
  priority: NavPresentationPriority;
  sortOrder: number;
};

export const NAVIGATION_DOMAIN_DEFINITIONS: Record<
  AppNavigationDomainId,
  DomainDefinition
> = {
  dashboard: {
    labelKey: "AppShell.domains.dashboard",
    fallbackLabel: "Dashboard",
    priority: 1,
    sortOrder: 10,
  },
  planning: {
    labelKey: "AppShell.domains.planning",
    fallbackLabel: "Planung",
    priority: 1,
    sortOrder: 20,
  },
  organisation: {
    labelKey: "AppShell.domains.organisation",
    fallbackLabel: "Organisation",
    priority: 1,
    sortOrder: 30,
  },
  communication: {
    labelKey: "AppShell.domains.communication",
    fallbackLabel: "Kommunikation",
    priority: 2,
    sortOrder: 40,
  },
  club: {
    labelKey: "AppShell.domains.club",
    fallbackLabel: "Club",
    priority: 3,
    sortOrder: 50,
  },
  "platform-overview": {
    labelKey: "AppShell.domains.platformOverview",
    fallbackLabel: "Platform",
    priority: 1,
    sortOrder: 10,
  },
  "platform-governance": {
    labelKey: "AppShell.domains.platformGovernance",
    fallbackLabel: "Governance",
    priority: 2,
    sortOrder: 20,
  },
  "platform-commercial": {
    labelKey: "AppShell.domains.platformCommercial",
    fallbackLabel: "Commercial",
    priority: 2,
    sortOrder: 30,
  },
  "platform-operations": {
    labelKey: "AppShell.domains.platformOperations",
    fallbackLabel: "Operations",
    priority: 3,
    sortOrder: 40,
  },
};

/** Club workspace: former sidebar item key → domain id. */
export const CLUB_NAV_ITEM_TO_DOMAIN: Record<string, AppNavigationDomainId> = {
  dashboard: "dashboard",
  planung: "planning",
  organisation: "organisation",
  mitglieder: "organisation",
  anmeldungen: "organisation",
  helfereinsaetze: "organisation",
  "trainer-staff": "organisation",
  communication: "communication",
  workspace: "communication",
  aufgaben: "communication",
  website: "club",
  infoboard: "club",
  meetings: "club",
  "club-entwicklung": "club",
  material: "club",
  finanzen: "club",
  sponsoring: "club",
  "formulare-freigaben": "club",
  "vorfaelle-disziplin": "club",
  administration: "club",
};

export const PLATFORM_NAV_ITEM_TO_DOMAIN: Record<string, AppNavigationDomainId> = {
  "platform-dashboard": "platform-overview",
  "platform-clubs": "platform-governance",
  "platform-access": "platform-governance",
  "platform-commercial": "platform-commercial",
  "platform-integrations": "platform-operations",
  "platform-operations": "platform-operations",
};

export function resolveNavItemDomainId(
  navItemKey: string,
  workspaceContext: "club" | "platform",
): AppNavigationDomainId | null {
  const map = workspaceContext === "platform" ? PLATFORM_NAV_ITEM_TO_DOMAIN : CLUB_NAV_ITEM_TO_DOMAIN;
  return map[navItemKey] ?? null;
}

function mapNavItemToDestination(item: NavItem): NavigationDestination {
  return {
    key: item.key,
    label: item.label,
    href: item.href,
    carrySeason: item.carrySeason,
    children: item.children,
  };
}

export function buildNavigationDomainsFromSections(
  sections: NavSection[],
  workspaceContext: "club" | "platform" = "club",
): NavigationDomain[] {
  const grouped = new Map<AppNavigationDomainId, NavigationDestination[]>();

  for (const section of sections) {
    for (const item of section.items) {
      const domainId = resolveNavItemDomainId(item.key, workspaceContext);
      if (!domainId) continue;
      const list = grouped.get(domainId) ?? [];
      list.push(mapNavItemToDestination(item));
      grouped.set(domainId, list);
    }
  }

  const domains: NavigationDomain[] = [];
  for (const [id, destinations] of grouped) {
    if (destinations.length === 0) continue;
    const def = NAVIGATION_DOMAIN_DEFINITIONS[id];
    domains.push({
      id,
      labelKey: def.labelKey,
      fallbackLabel: def.fallbackLabel,
      priority: def.priority,
      sortOrder: def.sortOrder,
      defaultDestination: destinations[0]!,
      destinations,
    });
  }

  return domains.sort((a, b) => a.sortOrder - b.sortOrder || a.fallbackLabel.localeCompare(b.fallbackLabel));
}

/** Documented domain map for acceptance reporting (club workspace). */
export const CLUB_DOMAIN_MAP_SUMMARY = {
  dashboard: ["dashboard"],
  planning: ["planung"],
  organisation: [
    "organisation",
    "mitglieder",
    "anmeldungen",
    "helfereinsaetze",
    "trainer-staff",
  ],
  communication: ["communication", "workspace", "aufgaben"],
  club: [
    "website",
    "infoboard",
    "meetings",
    "club-entwicklung",
    "material",
    "finanzen",
    "sponsoring",
    "formulare-freigaben",
    "vorfaelle-disziplin",
    "administration",
  ],
} as const;
