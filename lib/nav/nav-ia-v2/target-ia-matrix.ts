/**
 * SCE-NAV-IA-V2-01 — canonical target IA matrix (audit / implementation spec only).
 */

import type { AppNavigationDomainId } from "@/lib/nav/app-navigation-domains";
import type { NavIaV2TargetL1, TargetIaRecord, OrganisationMigrationRecord } from "@/lib/nav/nav-ia-v2/types";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";

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

function resolveTargetL1(key: string, currentL1: AppNavigationDomainId | null): NavIaV2TargetL1 | AppNavigationDomainId {
  if (key.startsWith("platform-")) {
    return currentL1 ?? "platform-overview";
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

function resolveMigrationReason(key: string, currentL1: AppNavigationDomainId | null): string {
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
  currentL1: AppNavigationDomainId | null;
  parentKey: string | null;
  permissionKeys: import("@/lib/permissions/permissions").PermissionKey[] | undefined;
  classification: TargetIaRecord["classification"];
  workspace: TargetIaRecord["workspace"];
  visibleInHeader: boolean;
  visibleInExplorer: boolean;
  mobileEligible: boolean;
}): TargetIaRecord {
  const targetL1 = resolveTargetL1(input.key, input.currentL1);
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
  }>,
): OrganisationMigrationRecord[] {
  const orgDomainKeys = inventory.filter((row) => row.currentL1 === "organisation");

  return orgDomainKeys.map((row) => {
    const target = buildTargetIaRecord({
      ...row,
      parentKey: null,
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
    keys: ["website", "website-overview"],
  },
  {
    id: "inhalte",
    label: "Inhalte",
    keys: ["website-news", "website-pages", "website-editorial", "website-components"],
  },
  {
    id: "website",
    label: "Website",
    keys: ["website-homepage", "website-navigation", "website-blocks"],
  },
  {
    id: "medien",
    label: "Medien",
    keys: ["website-media"],
  },
  {
    id: "kanaele",
    label: "Kanäle",
    keys: ["website-publishing", "infoboard", "infoboard-overview", "infoboard-preview"],
  },
  {
    id: "einstellungen",
    label: "Einstellungen",
    keys: ["website-settings"],
  },
] as const;

/** Club L2 taxonomy (header-visible subset vs explorer-only deep admin). */
export const CLUB_TARGET_L2_GROUPS = [
  { id: "organisation", label: "Organisation", headerVisible: true },
  { id: "people-teams", label: "People & Teams", headerVisible: true },
  { id: "mitgliedschaft", label: "Mitgliedschaft", headerVisible: true },
  { id: "vereinsentwicklung", label: "Vereinsentwicklung", headerVisible: true },
  { id: "club-betrieb", label: "Club-Betrieb", headerVisible: true },
  { id: "finanzen", label: "Finanzen & Partnerschaften", headerVisible: true },
  { id: "administration", label: "Administration", headerVisible: false },
] as const;

export const ROUTES_REQUIRING_CHANGE: string[] = [];
export const REDIRECTS_REQUIRED: string[] = [];
