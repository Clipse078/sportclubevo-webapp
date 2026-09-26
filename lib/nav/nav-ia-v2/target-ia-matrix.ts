/**
 * SCE-NAV-IA-V2-01 — canonical target IA matrix (audit / implementation spec only).
 */

import type { AppNavigationDomainId } from "@/lib/nav/app-navigation-domains";
import type { NavIaV2TargetL1, TargetIaRecord, OrganisationMigrationRecord } from "@/lib/nav/nav-ia-v2/types";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";

/** Pre-V2-02 club L1 domain id (audit-only). */
export type LegacyV1ClubNavigationDomainId = AppNavigationDomainId | "organisation";

/** Proposed L1 domain icon (existing SCE V2 masters only). */
export const TARGET_L1_SCE_ICONS: Record<NavIaV2TargetL1, string> = {
  dashboard: "dashboard",
  planung: "planning",
  kommunikation: "communication",
  club: "club",
  publishing: "publish",
};

const PUBLISHING_KEYS = new Set([
  "website",
  "website-overview",
  "website-news",
  "website-pages",
  "website-homepage",
  "website-navigation",
  "website-blocks",
  "website-media",
  "website-editorial",
  "website-publishing",
  "website-components",
  "website-settings",
  "infoboard",
  "infoboard-overview",
  "infoboard-preview",
]);

const CLUB_ORGANISATION_KEYS = new Set([
  "organisation",
  "org-units",
  "target-groups",
  "vereine",
  "competitions",
]);

const CLUB_PEOPLE_KEYS = new Set([
  "teams",
  "provider-mapping",
  "personen",
  "mitglieder",
  "trainer-staff",
]);

const CLUB_MEMBERSHIP_KEYS = new Set([
  "anmeldungen",
  "registrierungen",
  "warteliste",
  "archiv",
]);

const CLUB_DEVELOPMENT_KEYS = new Set([
  "club-entwicklung",
  "club-entwicklung-ziele",
  "club-entwicklung-initiativen",
  "club-entwicklung-prozesse",
]);

const CLUB_OPERATIONS_KEYS = new Set([
  "meetings",
  "material",
  "helfereinsaetze",
  "formulare-freigaben",
  "vorfaelle-disziplin",
]);

const CLUB_COMMERCIAL_KEYS = new Set(["finanzen", "sponsoring"]);

const CLUB_ADMIN_KEYS = new Set([
  "administration",
  "admin-tenant-roles",
  "admin-seasons",
  "admin-facilities",
  "admin-branding",
  "admin-people-access",
  "admin-roles",
  "admin-tenants",
  "admin-integrations",
]);

const PLANUNG_KEYS = new Set([
  "planung",
  "wochenplanner",
  "trainingcenter",
  "matchcenter",
  "tournamentcenter",
  "veranstaltungen",
]);

const KOMMUNIKATION_KEYS = new Set([
  "aufgaben",
  "communication",
  "communication-email-sender",
  "workspace",
]);

const DASHBOARD_KEYS = new Set(["dashboard"]);

const LABEL_V2_OVERRIDES: Record<string, string> = {
  planung: "Planung",
  communication: "Kommunikation",
  "club-entwicklung": "Vereinsentwicklung",
  "website-overview": "Publishing-Übersicht",
  meetings: "Sitzungen",
  "trainer-staff": "Trainer & Mitarbeitende",
  "formulare-freigaben": "Formulare & Freigaben",
  "vorfaelle-disziplin": "Vorfälle & Disziplin",
  "admin-people-access": "Personen & Zugänge",
  "admin-facilities": "Anlagen & Ressourcen",
};

export function resolveNavKeyTargetL1(
  key: string,
  currentL1: LegacyV1ClubNavigationDomainId | AppNavigationDomainId | null = null,
): NavIaV2TargetL1 | AppNavigationDomainId {
  if (key.startsWith("platform-")) {
    if (currentL1 && String(currentL1).startsWith("platform-")) {
      return currentL1 as AppNavigationDomainId;
    }
    return "platform-overview";
  }
  if (DASHBOARD_KEYS.has(key)) return "dashboard";
  if (PLANUNG_KEYS.has(key)) return "planung";
  if (KOMMUNIKATION_KEYS.has(key)) return "kommunikation";
  if (PUBLISHING_KEYS.has(key)) return "publishing";
  if (
    CLUB_ORGANISATION_KEYS.has(key) ||
    CLUB_PEOPLE_KEYS.has(key) ||
    CLUB_MEMBERSHIP_KEYS.has(key) ||
    CLUB_DEVELOPMENT_KEYS.has(key) ||
    CLUB_OPERATIONS_KEYS.has(key) ||
    CLUB_COMMERCIAL_KEYS.has(key) ||
    CLUB_ADMIN_KEYS.has(key)
  ) {
    return "club";
  }
  return "club";
}

function resolveTargetL2(key: string): string {
  if (DASHBOARD_KEYS.has(key)) return "Persönliche Übersicht";
  if (PLANUNG_KEYS.has(key)) {
    if (key === "planung") return "Planung";
    return "Sport & Termine";
  }
  if (KOMMUNIKATION_KEYS.has(key)) {
    if (key === "workspace") return "Dokumente";
    if (key.startsWith("communication")) return "Nachrichten & Einstellungen";
    return "Aufgaben & Koordination";
  }
  if (PUBLISHING_KEYS.has(key)) {
    if (key.startsWith("infoboard")) return "Kanäle";
    if (key === "website-settings") return "Einstellungen";
    if (key === "website-media") return "Medien";
    if (key === "website-publishing") return "Kanäle";
    if (["website-homepage", "website-navigation", "website-blocks"].includes(key)) {
      return "Website";
    }
    if (["website-news", "website-pages", "website-editorial", "website-components"].includes(key)) {
      return "Inhalte";
    }
    return "Übersicht";
  }
  if (CLUB_ORGANISATION_KEYS.has(key)) return "Organisation";
  if (CLUB_PEOPLE_KEYS.has(key)) return "People & Teams";
  if (CLUB_MEMBERSHIP_KEYS.has(key)) return "Mitgliedschaft";
  if (CLUB_DEVELOPMENT_KEYS.has(key)) return "Vereinsentwicklung";
  if (CLUB_OPERATIONS_KEYS.has(key)) return "Club-Betrieb";
  if (CLUB_COMMERCIAL_KEYS.has(key)) return "Finanzen & Partnerschaften";
  if (CLUB_ADMIN_KEYS.has(key)) return "Administration";
  return "Club";
}

function resolveTargetLocalGroup(key: string, parentKey: string | null): string | null {
  if (parentKey && parentKey !== key) {
    return parentKey;
  }
  return null;
}

function resolveMigrationReason(key: string, currentL1: LegacyV1ClubNavigationDomainId | null): string {
  if (currentL1 === "organisation") {
    if (PUBLISHING_KEYS.has(key)) {
      return "Publishing ist eigenständige Verantwortungsdomäne (Kanäle/Inhalte).";
    }
    if (KOMMUNIKATION_KEYS.has(key)) {
      return "Koordinationsmodul; gehört semantisch zu Kommunikation, nicht Organisation.";
    }
    return "Organisation wird unter Club als Struktur-/Stammdatenbereich geführt.";
  }
  if (currentL1 === "club" && PUBLISHING_KEYS.has(key)) {
    return "Website/Infoboard/Inhalte werden zur Publishing-L1-Domäne promoted.";
  }
  if (PLANUNG_KEYS.has(key)) {
    return "Unverändert: operative Sport- und Terminplanung.";
  }
  return "Semantische Zuordnung gemäss Verantwortungsdomäne V2.";
}

export function buildTargetIaRecord(input: {
  key: string;
  label: string;
  route: string;
  currentL1: LegacyV1ClubNavigationDomainId | AppNavigationDomainId | null;
  parentKey: string | null;
  permissionKeys: import("@/lib/permissions/permissions").PermissionKey[] | undefined;
  classification: TargetIaRecord["classification"];
  workspace: TargetIaRecord["workspace"];
  visibleInHeader: boolean;
  visibleInExplorer: boolean;
  mobileEligible: boolean;
}): TargetIaRecord {
  const targetL1 = resolveNavKeyTargetL1(input.key, input.currentL1);
  const targetL2 = resolveTargetL2(input.key);
  const icon = getNavDestinationSceIconName(input.key);

  return {
    key: input.key,
    route: input.route,
    label: input.label,
    labelV2: LABEL_V2_OVERRIDES[input.key] ?? input.label,
    icon,
    targetL1,
    targetL2,
    targetLocalGroup: resolveTargetLocalGroup(input.key, input.parentKey),
    visibility: {
      header: input.visibleInHeader,
      explorer: input.visibleInExplorer,
      mobileEligible: input.mobileEligible,
    },
    permissionKeys: input.permissionKeys,
    classification: input.classification,
    workspace: input.workspace,
    routePreserved: true,
    migrationReason: resolveMigrationReason(input.key, input.currentL1),
  };
}

export function buildOrganisationMigrationRecords(
  inventory: Array<{
    key: string;
    label: string;
    route: string;
    currentL1: AppNavigationDomainId | null;
    parentKey?: string | null;
  }>,
): OrganisationMigrationRecord[] {
  const orgDomainKeys = inventory.filter((row) =>
    wasLegacyOrganisationNavDestination({
      key: row.key,
      parentKey: row.parentKey ?? null,
    }),
  );

  return orgDomainKeys.map((row) => {
    const legacyTopKey = row.parentKey ?? row.key;
    const legacyCurrentL1 = resolveLegacyClubNavItemDomainId(legacyTopKey);
    const target = buildTargetIaRecord({
      ...row,
      currentL1: legacyCurrentL1,
      parentKey: row.parentKey ?? null,
      permissionKeys: undefined,
      classification: "SECONDARY_DESTINATION",
      workspace: "club",
      visibleInHeader: true,
      visibleInExplorer: true,
      mobileEligible: true,
    });

    let disposition: OrganisationMigrationRecord["disposition"] = "MOVE_TO_CLUB";
    if (target.targetL1 === "kommunikation") {
      disposition = "MOVE_ELSEWHERE";
    } else if (target.targetL1 === "publishing") {
      disposition = "MOVE_ELSEWHERE";
    }

    return {
      key: row.key,
      label: row.label,
      route: row.route,
      targetL1: target.targetL1 as NavIaV2TargetL1,
      targetL2: target.targetL2,
      targetGroup: target.targetL2,
      reason: target.migrationReason,
      disposition,
    };
  });
}

/** Publishing L2 taxonomy for V2 (every group maps to live routes). */
export const PUBLISHING_TARGET_L2_GROUPS = [
  {
    id: "uebersicht",
    label: "Übersicht",
    headerVisible: true,
    keys: ["website", "website-overview"],
  },
  {
    id: "inhalte",
    label: "Inhalte",
    headerVisible: true,
    keys: ["website-news", "website-pages", "website-editorial", "website-components"],
  },
  {
    id: "website",
    label: "Website",
    headerVisible: false,
    keys: ["website-homepage", "website-navigation", "website-blocks"],
  },
  {
    id: "medien",
    label: "Medien",
    headerVisible: true,
    keys: ["website-media"],
  },
  {
    id: "kanaele",
    label: "Kanäle",
    headerVisible: true,
    keys: ["website-publishing", "infoboard", "infoboard-overview", "infoboard-preview"],
  },
  {
    id: "einstellungen",
    label: "Einstellungen",
    headerVisible: false,
    keys: ["website-settings"],
  },
] as const;

/** Club L2 taxonomy (header-visible subset vs explorer-only deep admin). */
export const CLUB_TARGET_L2_GROUPS = [
  {
    id: "organisation",
    label: "Organisation",
    headerVisible: true,
    keys: ["organisation", "org-units", "target-groups", "vereine", "competitions"],
  },
  {
    id: "people-teams",
    label: "People & Teams",
    headerVisible: true,
    keys: ["mitglieder", "teams", "trainer-staff", "personen", "provider-mapping"],
  },
  {
    id: "mitgliedschaft",
    label: "Mitgliedschaft",
    headerVisible: true,
    keys: ["anmeldungen", "registrierungen", "warteliste", "archiv"],
  },
  {
    id: "vereinsentwicklung",
    label: "Vereinsentwicklung",
    headerVisible: true,
    keys: [
      "club-entwicklung",
      "club-entwicklung-ziele",
      "club-entwicklung-initiativen",
      "club-entwicklung-prozesse",
    ],
  },
  {
    id: "club-betrieb",
    label: "Club-Betrieb",
    headerVisible: true,
    keys: ["meetings", "material", "helfereinsaetze", "formulare-freigaben", "vorfaelle-disziplin"],
  },
  {
    id: "finanzen",
    label: "Finanzen & Partnerschaften",
    headerVisible: true,
    keys: ["finanzen", "sponsoring"],
  },
  {
    id: "administration",
    label: "Administration",
    headerVisible: false,
    keys: [
      "administration",
      "admin-tenant-roles",
      "admin-seasons",
      "admin-facilities",
      "admin-branding",
      "admin-people-access",
      "admin-roles",
      "admin-tenants",
      "admin-integrations",
    ],
  },
] as const;

export type NavHeaderL2GroupDefinition = {
  id: string;
  label: string;
  headerVisible?: boolean;
  keys?: readonly string[];
};

export const ROUTES_REQUIRING_CHANGE: string[] = [];
export const REDIRECTS_REQUIRED: string[] = [];

/** V1 club L1 mapping retained for migration audit (SCE-NAV-IA-V2-01). */
export const LEGACY_CLUB_NAV_ITEM_TO_DOMAIN: Record<string, LegacyV1ClubNavigationDomainId> = {
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

export function resolveLegacyClubNavItemDomainId(
  navItemKey: string,
): LegacyV1ClubNavigationDomainId | null {
  return LEGACY_CLUB_NAV_ITEM_TO_DOMAIN[navItemKey] ?? null;
}

export function mapNavIaV2TargetL1ToAppDomainId(
  targetL1: NavIaV2TargetL1 | AppNavigationDomainId,
): AppNavigationDomainId {
  switch (targetL1) {
    case "dashboard":
      return "dashboard";
    case "planung":
      return "planning";
    case "kommunikation":
      return "communication";
    case "club":
      return "club";
    case "publishing":
      return "publishing";
    default:
      return targetL1 as AppNavigationDomainId;
  }
}

export function resolveClubWorkspaceNavItemDomainId(navItemKey: string): AppNavigationDomainId | null {
  const targetL1 = resolveNavKeyTargetL1(navItemKey, null);
  if (typeof targetL1 === "string" && targetL1.startsWith("platform-")) {
    return null;
  }
  return mapNavIaV2TargetL1ToAppDomainId(targetL1);
}

export function resolveTargetL2ForNavKey(key: string): string {
  return resolveTargetL2(key);
}

export function resolveDestinationIaMetadata(key: string): {
  targetL2: string;
  visibility: TargetIaRecord["visibility"];
} {
  return {
    targetL2: resolveTargetL2(key),
    visibility: {
      header: true,
      explorer: true,
      mobileEligible: true,
    },
  };
}

export function wasLegacyOrganisationNavDestination(input: {
  key: string;
  parentKey: string | null;
}): boolean {
  const topLevelKey = input.parentKey ?? input.key;
  if (resolveLegacyClubNavItemDomainId(topLevelKey) === "organisation") {
    return true;
  }
  if (input.parentKey === "organisation") {
    return true;
  }
  return false;
}

/** Deterministic L1 default module keys (existing routes only). */
export const CLUB_L1_DEFAULT_DESTINATION_KEYS: Record<NavIaV2TargetL1, string> = {
  dashboard: "dashboard",
  planung: "planung",
  kommunikation: "communication",
  club: "organisation",
  publishing: "website",
};

export const CLUB_L1_SCE_ICON_BY_DOMAIN: Record<NavIaV2TargetL1, string> = {
  dashboard: TARGET_L1_SCE_ICONS.dashboard,
  planung: TARGET_L1_SCE_ICONS.planung,
  kommunikation: TARGET_L1_SCE_ICONS.kommunikation,
  club: TARGET_L1_SCE_ICONS.club,
  publishing: TARGET_L1_SCE_ICONS.publishing,
};
