/**
 * SCE-PILOT-03 — reproducible tenant role templates (not seeded/applied automatically).
 *
 * Assign via /dashboard/administration/roles after running:
 *   npx tsx scripts/sync-sce-pilot-03-permissions.ts
 * with APPLY_PERMISSION_SYNC=true on the target database.
 */

import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

export const PILOT_TENANT_KEY = "fc-allschwil";

export type PilotRoleDefinition = {
  roleKey: string;
  name: string;
  description: string;
  permissionKeys: readonly PermissionKey[];
  permissionRationale: Readonly<Record<string, string>>;
};

const SHARED_READ_PERSONAL: PermissionKey[] = [
  PERMISSIONS.SEASONS_VIEW,
  PERMISSIONS.TEAMS_VIEW,
  PERMISSIONS.FACILITIES_VIEW,
  PERMISSIONS.ORG_VIEW,
  PERMISSIONS.TASKS_VIEW,
  PERMISSIONS.REQUIREMENTS_VIEW,
  PERMISSIONS.WORKSPACE_VIEW,
  PERMISSIONS.COMMUNICATION_CLUB_VIEW,
  PERMISSIONS.NEWS_VIEW,
  PERMISSIONS.WEBSITE_VIEW,
  PERMISSIONS.INFOBOARD_VIEW,
];

const sandraRationale: Record<string, string> = {
  "planning.allocations.view": "Wochenplaner lesen, Konflikte/Verfügbarkeit",
  "planning.allocations.manage": "Platz- und Garderoben-Zuteilungen ohne Event-Manage",
  "trainings.view": "Trainings im Planungskontext lesen",
  "events.view": "Spiele/Turniere im Planungskontext lesen",
  "seasons.view": "Saisonkontext Wochenplaner",
  "teams.view": "Teamfilter Planung",
  "facilities.view": "Ressourcen-Selector",
  "tasks.view": "Eigene Aufgaben",
  "requirements.view": "Eigene Anforderungen beantworten",
  "workspace.view": "Geteilte Dokumente (ACL)",
  "communication.club.view": "Mitteilungen lesen (kein Senden/Posteingang)",
  "news.view": "Veröffentlichte News read-only",
  "website.view": "Publizieren/Website read-only",
  "infoboard.view": "Infoboard-Vorschau (read path)",
  "infoboard.manage": "Operative Infoboard-Verwaltung (Übersicht, Bearbeiten)",
};

export const SANDRA_FISCHER_SPIELBETRIEB_ROLE: PilotRoleDefinition = {
  roleKey: "pilot_spielbetrieb_koordinatorin",
  name: "Spielbetrieb Koordinatorin (Pilot)",
  description:
    "Spielbetrieb: Wochenplaner, Trainings-/Spiel-/Turniercenter (operative Zuteilungen); kein Club-Admin.",
  permissionKeys: [
    ...SHARED_READ_PERSONAL.filter((k) => k !== PERMISSIONS.ORG_VIEW),
    PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
    PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.INFOBOARD_MANAGE,
  ],
  permissionRationale: sandraRationale,
};

/** President-only capabilities on top of Spielbetrieb operational baseline (not Sandra template). */
const PRESIDENT_PILOT_SUPPLEMENTAL_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.ORG_VIEW,
  PERMISSIONS.REGISTRATIONS_VIEW,
  PERMISSIONS.REGISTRATIONS_EDIT,
  PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW,
  PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE,
  PERMISSIONS.NEWS_MANAGE,
];

function mergePilotPermissionKeys(
  ...groups: readonly (readonly PermissionKey[])[]
): PermissionKey[] {
  return [...new Set(groups.flat())] as PermissionKey[];
}

const patrickRationale: Record<string, string> = {
  ...sandraRationale,
  "org.view": "Club-Organisation read-only (Präsident)",
  "registrations.view": "Neue Anmeldungen / Registrierungen lesen",
  "registrations.edit": "Anmeldungen bearbeiten (Workflow, kein People-Admin)",
  "communication.zielgruppen.view": "Zielgruppen lesen (bestehender Präsident-Pilot)",
  "communication.zielgruppen.manage": "Zielgruppen pflegen (bestehender Präsident-Pilot, kein Club-Admin)",
  "news.manage": "News redaktionell (bestehender Präsident-Pilot, kein Website-Manage)",
};

/** FCA Human UAT: Sandra Spielbetrieb baseline + Präsident document/registration surfaces. */
export const PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE: PilotRoleDefinition = {
  roleKey: "pilot_praesident",
  name: "Präsident (Pilot)",
  description:
    "Präsident FCA-Pilot: Spielbetrieb-Operationalbaseline (Wochenplaner/Zuteilungen, Center-Views) plus Anmeldungen, Dokumente, Club-Org; kein Club-Admin.",
  permissionKeys: mergePilotPermissionKeys(
    SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys,
    PRESIDENT_PILOT_SUPPLEMENTAL_PERMISSIONS,
  ),
  permissionRationale: patrickRationale,
};

/** @deprecated Prefer PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE — retained for import stability. */
export const PATRICK_SCOTTON_PILOT_VIEWER_ROLE = PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE;

/** Explicitly excluded from both pilots (documentation / tests). */
export const PILOT_FORBIDDEN_PERMISSION_KEYS: PermissionKey[] = [
  PERMISSIONS.TRAININGS_MANAGE,
  PERMISSIONS.EVENTS_MANAGE,
  PERMISSIONS.WOCHENPLAN_MANAGE,
  PERMISSIONS.EVENTS_PUBLISH_WEBSITE,
  PERMISSIONS.EVENTS_PUBLISH_INFOBOARD,
  PERMISSIONS.NEWS_MANAGE,
  PERMISSIONS.WEBSITE_MANAGE,
  PERMISSIONS.PEOPLE_VIEW,
  PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
  PERMISSIONS.COMMUNICATION_INBOX_VIEW,
  PERMISSIONS.COMMUNICATION_INBOX_REPLY,
  PERMISSIONS.COMMUNICATION_CLUB_SEND,
  PERMISSIONS.FACILITIES_MANAGE,
  PERMISSIONS.TASKS_MANAGE,
  PERMISSIONS.TASKS_VIEW_ALL,
];
