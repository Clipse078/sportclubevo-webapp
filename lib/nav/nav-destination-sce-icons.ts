import type { SceIconRegistryName } from "@/components/design-system/icons/registry";

/**
 * SCE-ICONS-02 — canonical nav destination → approved SCE hero icon names.
 * Keys match {@link NavItem.key} / {@link NavItemChild.key} in nav-config.
 */
export const NAV_DESTINATION_SCE_ICON_BY_KEY = {
  dashboard: "dashboard",
  wochenplanner: "week-planner",
  trainingcenter: "training",
  matchcenter: "match",
  tournamentcenter: "tournament",
  veranstaltungen: "events",
  planung: "planning",
  organisation: "organisation",
  teams: "team",
  "org-units": "org-unit",
  "provider-mapping": "integration",
  vereine: "club",
  personen: "people",
  workspace: "documents",
  aufgaben: "tasks",
  communication: "communication",
  "communication-email-sender": "communication",
  mitglieder: "member",
  anmeldungen: "invitation",
  registrierungen: "invitation",
  archiv: "archive",
  helfereinsaetze: "volunteer",
  "trainer-staff": "coach",
  meetings: "committee-board",
  "club-entwicklung": "insight",
  "club-entwicklung-prozesse": "workflow",
  website: "website",
  "website-overview": "website",
  "website-news": "news",
  "website-homepage": "website",
  "website-editorial": "news",
  "website-publishing": "publish",
  "website-components": "form",
  "website-settings": "settings",
  infoboard: "infoboard",
  "infoboard-overview": "infoboard",
  "infoboard-preview": "infoboard",
  finanzen: "finance",
  sponsoring: "sponsor",
  "formulare-freigaben": "form",
  administration: "settings",
  "admin-tenant-roles": "roles-access",
  "admin-seasons": "season",
  "admin-facilities": "facility",
  "admin-branding": "settings",
  "admin-people-access": "people",
  "admin-roles": "roles-access",
  "admin-integrations": "integration",
  "admin-tenants": "organisation",
  "platform-dashboard": "dashboard",
  "platform-clubs": "club",
  "platform-commercial": "finance",
  "platform-commercial-billing-overview": "finance",
  "platform-commercial-billing-customers": "commercial-account",
  "platform-commercial-billing-contracts": "contract",
  "platform-commercial-billing-invoices": "billing-invoice",
  "platform-commercial-billing-reconciliation": "transaction",
  "platform-commercial-billing-settings": "settings",
  "platform-commercial-billing-operations": "finance",
  "platform-integrations": "integration",
  "platform-users": "people",
  "platform-permissions": "roles-access",
  "platform-roles": "roles-access",
  "platform-operations": "audit",
  "platform-access": "roles-access",
} as const satisfies Record<string, SceIconRegistryName>;

export type NavDestinationSceIconKey = keyof typeof NAV_DESTINATION_SCE_ICON_BY_KEY;

export function getNavDestinationSceIconName(
  navItemKey: string,
): SceIconRegistryName | null {
  return (
    NAV_DESTINATION_SCE_ICON_BY_KEY[
      navItemKey as NavDestinationSceIconKey
    ] ?? null
  );
}

/** Quick-access stable keys use the `navigation.{navItemKey}` prefix. */
export function getQuickAccessNavItemKey(stableKey: string): string | null {
  const prefix = "navigation.";
  if (!stableKey.startsWith(prefix)) {
    return null;
  }
  return stableKey.slice(prefix.length);
}

export function getQuickAccessSceIconName(
  stableKey: string,
): SceIconRegistryName | null {
  const navItemKey = getQuickAccessNavItemKey(stableKey);
  if (!navItemKey) {
    return null;
  }
  return getNavDestinationSceIconName(navItemKey);
}
