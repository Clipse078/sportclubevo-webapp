/**
 * SCE-VISUAL-03R1 / SCE-NAV-IA-V2-02 — semantic navigation domains above canonical NAV_SECTIONS destinations.
 *
 * Route permissions and labels remain on {@link NavItem} entries in nav-config;
 * this file defines grouping for shell presentation using the V2 target IA contract.
 */

import type { NavItem, NavSection } from "@/lib/nav/nav-config";
import {
  CLUB_L1_DEFAULT_DESTINATION_KEYS,
  CLUB_L1_SCE_ICON_BY_DOMAIN,
  CLUB_TARGET_L2_GROUPS,
  PUBLISHING_TARGET_L2_GROUPS,
  resolveClubWorkspaceNavItemDomainId,
  resolveDestinationIaMetadata,
} from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import type { NavVisibilityContract } from "@/lib/nav/nav-ia-v2/types";

export type NavPresentationPriority = 1 | 2 | 3;

export type ClubAppNavigationDomainId =
  | "dashboard"
  | "planning"
  | "communication"
  | "club"
  | "publishing";

export type PlatformAppNavigationDomainId =
  | "platform-overview"
  | "platform-governance"
  | "platform-commercial"
  | "platform-operations";

export type AppNavigationDomainId = ClubAppNavigationDomainId | PlatformAppNavigationDomainId;

export type NavigationDestination = {
  /** Canonical nav-config item key. */
  key: string;
  label: string;
  href: string;
  carrySeason?: boolean;
  children?: NavItem["children"];
  /** V2 canonical L2 responsibility group label. */
  canonicalL2Group?: string;
  visibility?: NavVisibilityContract;
};

export type NavigationDomain = {
  id: AppNavigationDomainId;
  labelKey: string;
  /** Product label when i18n is unavailable (German product copy). */
  fallbackLabel: string;
  priority: NavPresentationPriority;
  sortOrder: number;
  /** Existing SCE V2 master for L1 presentation. */
  l1SceIconKey: string;
  defaultDestination: NavigationDestination;
  destinations: NavigationDestination[];
  /** Explorer / header grouping metadata (visibility toggles are V2-03 inputs). */
  l2GroupMetadata?: readonly {
    id: string;
    label: string;
    headerVisible?: boolean;
    keys?: readonly string[];
  }[];
};

type DomainDefinition = {
  labelKey: string;
  fallbackLabel: string;
  priority: NavPresentationPriority;
  sortOrder: number;
  l1SceIconKey: string;
  defaultDestinationKey: string;
  l2GroupMetadata?: NavigationDomain["l2GroupMetadata"];
};

export const NAVIGATION_DOMAIN_DEFINITIONS: Record<AppNavigationDomainId, DomainDefinition> = {
  dashboard: {
    labelKey: "AppShell.domains.dashboard",
    fallbackLabel: "Dashboard",
    priority: 1,
    sortOrder: 10,
    l1SceIconKey: CLUB_L1_SCE_ICON_BY_DOMAIN.dashboard,
    defaultDestinationKey: CLUB_L1_DEFAULT_DESTINATION_KEYS.dashboard,
  },
  planning: {
    labelKey: "AppShell.domains.planning",
    fallbackLabel: "Planung",
    priority: 1,
    sortOrder: 20,
    l1SceIconKey: CLUB_L1_SCE_ICON_BY_DOMAIN.planung,
    defaultDestinationKey: CLUB_L1_DEFAULT_DESTINATION_KEYS.planung,
  },
  communication: {
    labelKey: "AppShell.domains.communication",
    fallbackLabel: "Kommunikation",
    priority: 2,
    sortOrder: 30,
    l1SceIconKey: CLUB_L1_SCE_ICON_BY_DOMAIN.kommunikation,
    defaultDestinationKey: CLUB_L1_DEFAULT_DESTINATION_KEYS.kommunikation,
  },
  club: {
    labelKey: "AppShell.domains.club",
    fallbackLabel: "Club",
    priority: 3,
    sortOrder: 40,
    l1SceIconKey: CLUB_L1_SCE_ICON_BY_DOMAIN.club,
    defaultDestinationKey: CLUB_L1_DEFAULT_DESTINATION_KEYS.club,
    l2GroupMetadata: CLUB_TARGET_L2_GROUPS,
  },
  publishing: {
    labelKey: "AppShell.domains.publishing",
    fallbackLabel: "Publizieren",
    priority: 2,
    sortOrder: 50,
    l1SceIconKey: CLUB_L1_SCE_ICON_BY_DOMAIN.publishing,
    defaultDestinationKey: CLUB_L1_DEFAULT_DESTINATION_KEYS.publishing,
    l2GroupMetadata: PUBLISHING_TARGET_L2_GROUPS,
  },
  "platform-overview": {
    labelKey: "AppShell.domains.platformOverview",
    fallbackLabel: "Platform",
    priority: 1,
    sortOrder: 10,
    l1SceIconKey: "dashboard",
    defaultDestinationKey: "platform-dashboard",
  },
  "platform-governance": {
    labelKey: "AppShell.domains.platformGovernance",
    fallbackLabel: "Governance",
    priority: 2,
    sortOrder: 20,
    l1SceIconKey: "organisation",
    defaultDestinationKey: "platform-clubs",
  },
  "platform-commercial": {
    labelKey: "AppShell.domains.platformCommercial",
    fallbackLabel: "Commercial",
    priority: 2,
    sortOrder: 30,
    l1SceIconKey: "finance",
    defaultDestinationKey: "platform-commercial",
  },
  "platform-operations": {
    labelKey: "AppShell.domains.platformOperations",
    fallbackLabel: "Operations",
    priority: 3,
    sortOrder: 40,
    l1SceIconKey: "settings",
    defaultDestinationKey: "platform-operations",
  },
};

/** Club workspace: former sidebar item key → domain id (V2 canonical). */
export const CLUB_NAV_ITEM_TO_DOMAIN: Record<string, AppNavigationDomainId> = {
  dashboard: "dashboard",
  planung: "planning",
  organisation: "club",
  mitglieder: "club",
  anmeldungen: "club",
  helfereinsaetze: "club",
  "trainer-staff": "club",
  communication: "communication",
  workspace: "communication",
  aufgaben: "communication",
  website: "publishing",
  infoboard: "publishing",
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
  if (workspaceContext === "platform") {
    return PLATFORM_NAV_ITEM_TO_DOMAIN[navItemKey] ?? null;
  }
  return resolveClubWorkspaceNavItemDomainId(navItemKey);
}

function mapNavItemToDestination(item: NavItem): NavigationDestination {
  const ia = resolveDestinationIaMetadata(item.key);
  return {
    key: item.key,
    label: item.label,
    href: item.href,
    carrySeason: item.carrySeason,
    children: item.children,
    canonicalL2Group: ia.targetL2,
    visibility: ia.visibility,
  };
}

function resolveDefaultDestination(
  domainId: AppNavigationDomainId,
  destinations: NavigationDestination[],
): NavigationDestination {
  const def = NAVIGATION_DOMAIN_DEFINITIONS[domainId];
  const preferred = destinations.find((dest) => dest.key === def.defaultDestinationKey);
  return preferred ?? destinations[0]!;
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
      l1SceIconKey: def.l1SceIconKey,
      defaultDestination: resolveDefaultDestination(id, destinations),
      destinations,
      l2GroupMetadata: def.l2GroupMetadata,
    });
  }

  return domains.sort((a, b) => a.sortOrder - b.sortOrder || a.fallbackLabel.localeCompare(b.fallbackLabel));
}

/** Documented domain map for acceptance reporting (club workspace, V2). */
export const CLUB_DOMAIN_MAP_SUMMARY = {
  dashboard: ["dashboard"],
  planning: ["planung"],
  communication: ["communication", "workspace", "aufgaben"],
  club: [
    "organisation",
    "mitglieder",
    "anmeldungen",
    "helfereinsaetze",
    "trainer-staff",
    "meetings",
    "club-entwicklung",
    "material",
    "finanzen",
    "sponsoring",
    "formulare-freigaben",
    "vorfaelle-disziplin",
    "administration",
  ],
  publishing: ["website", "infoboard"],
} as const;

export const CLUB_L1_DOMAIN_ORDER: readonly ClubAppNavigationDomainId[] = [
  "dashboard",
  "planning",
  "communication",
  "club",
  "publishing",
];
