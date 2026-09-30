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
  "infoboard.view": "Infoboard-Vorschau ohne Manage",
};

export const SANDRA_FISCHER_SPIELBETRIEB_ROLE: PilotRoleDefinition = {
  roleKey: "pilot_spielbetrieb_koordinatorin",
  name: "Spielbetrieb Koordinatorin (Pilot)",
  description:
    "Wochenplaner-Zuteilungen verwalten; Planung sonst read-only; kein Publish/Admin/Personen.",
  permissionKeys: [
    ...SHARED_READ_PERSONAL.filter((k) => k !== PERMISSIONS.ORG_VIEW),
    PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
    PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
  ],
  permissionRationale: sandraRationale,
};

const patrickRationale: Record<string, string> = {
  "trainings.view": "Wochenplaner read-only",
  "events.view": "Spiele/Events read-only",
  "seasons.view": "Saisonkontext",
  "teams.view": "Teambezug",
  "org.view": "Club-Organisation read-only",
  "facilities.view": "Ressourcenlabels in Planung",
  "tasks.view": "Eigene Aufgaben",
  "requirements.view": "Eigene Anforderungen",
  "workspace.view": "Geteilte Dokumente (ACL)",
  "communication.club.view": "Mitteilungen (addressed/club feed, kein Posteingang)",
  "news.view": "News read-only",
  "website.view": "Publizieren read-only",
  "infoboard.view": "Infoboard-Vorschau",
  "planning.allocations.view": "Planungsstand ohne Mutation",
};

export const PATRICK_SCOTTON_PILOT_VIEWER_ROLE: PilotRoleDefinition = {
  roleKey: "pilot_praesident_viewer",
  name: "Präsident — Pilot Viewer",
  description: "Read-only Planung, Club, News/Publizieren/Infoboard; persönliche Aufgaben/Dokumente.",
  permissionKeys: [
    ...SHARED_READ_PERSONAL,
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
  ],
  permissionRationale: patrickRationale,
};

/** Explicitly excluded from both pilots (documentation / tests). */
export const PILOT_FORBIDDEN_PERMISSION_KEYS: PermissionKey[] = [
  PERMISSIONS.TRAININGS_MANAGE,
  PERMISSIONS.EVENTS_MANAGE,
  PERMISSIONS.WOCHENPLAN_MANAGE,
  PERMISSIONS.EVENTS_PUBLISH_WEBSITE,
  PERMISSIONS.EVENTS_PUBLISH_INFOBOARD,
  PERMISSIONS.NEWS_MANAGE,
  PERMISSIONS.WEBSITE_MANAGE,
  PERMISSIONS.INFOBOARD_MANAGE,
  PERMISSIONS.PEOPLE_VIEW,
  PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
  PERMISSIONS.COMMUNICATION_INBOX_VIEW,
  PERMISSIONS.COMMUNICATION_INBOX_REPLY,
  PERMISSIONS.COMMUNICATION_CLUB_SEND,
  PERMISSIONS.FACILITIES_MANAGE,
  PERMISSIONS.TASKS_MANAGE,
  PERMISSIONS.TASKS_VIEW_ALL,
];
