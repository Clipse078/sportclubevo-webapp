/**
 * SCE-DASHBOARD-V3-01 — permission-filtered dashboard quick actions.
 */

import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

export type DashboardQuickActionDef = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  permissionKeys: PermissionKey[];
};

export const DASHBOARD_QUICK_ACTION_CATALOG: DashboardQuickActionDef[] = [
  {
    key: "news",
    href: "/dashboard/website/news/new",
    title: "Neue News",
    subtitle: "Artikel erstellen",
    permissionKeys: [PERMISSIONS.NEWS_MANAGE, PERMISSIONS.WEBSITE_MANAGE],
  },
  {
    key: "training",
    href: "/dashboard/events/trainings/new",
    title: "Training planen",
    subtitle: "Termin erfassen",
    permissionKeys: [PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.EVENTS_VIEW],
  },
  {
    key: "match",
    href: "/dashboard/events/matches/new",
    title: "Spiel planen",
    subtitle: "Match erfassen",
    permissionKeys: [PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.EVENTS_VIEW],
  },
  {
    key: "tournament",
    href: "/dashboard/events/tournaments/new",
    title: "Turnier planen",
    subtitle: "Turnier erfassen",
    permissionKeys: [PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.EVENTS_VIEW],
  },
  {
    key: "veranstaltung",
    href: "/dashboard/events/other/new",
    title: "Veranstaltung",
    subtitle: "Event erfassen",
    permissionKeys: [PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.EVENTS_VIEW],
  },
  {
    key: "planner-week",
    href: "/dashboard/planner/week",
    title: "Wochenplanung",
    subtitle: "Felder & Zeiten",
    permissionKeys: [PERMISSIONS.WOCHENPLAN_MANAGE],
  },
  {
    key: "person",
    href: "/dashboard/persons/new",
    title: "Person erfassen",
    subtitle: "Stammdaten anlegen",
    permissionKeys: [PERMISSIONS.PEOPLE_MANAGE, PERMISSIONS.PEOPLE_VIEW],
  },
  {
    key: "infoboard",
    href: "/dashboard/infoboard",
    title: "Infoboard",
    subtitle: "Display verwalten",
    permissionKeys: [PERMISSIONS.INFOBOARD_MANAGE, PERMISSIONS.EVENTS_PUBLISH_INFOBOARD],
  },
  {
    key: "registrations",
    href: "/dashboard/registrations",
    title: "Anmeldungen",
    subtitle: "Eingänge prüfen",
    permissionKeys: [PERMISSIONS.REGISTRATIONS_VIEW, PERMISSIONS.REGISTRATIONS_EDIT],
  },
  {
    key: "events",
    href: "/dashboard/events",
    title: "Events",
    subtitle: "Kalender öffnen",
    permissionKeys: [PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE],
  },
  {
    key: "people-access",
    href: "/dashboard/admin/people-access",
    title: "Zugriffe",
    subtitle: "Personen & Rollen",
    permissionKeys: [PERMISSIONS.USERS_MANAGE],
  },
];

function hasAccess(userKeys: PermissionKey[], required: PermissionKey[]): boolean {
  return required.some((key) => userKeys.includes(key));
}

/** Returns permission-filtered quick actions (default cap keeps the cockpit compact). */
export function getDashboardQuickActionDefs(
  permissionKeys: PermissionKey[],
  limit = 8,
): DashboardQuickActionDef[] {
  return DASHBOARD_QUICK_ACTION_CATALOG.filter((action) =>
    hasAccess(permissionKeys, action.permissionKeys),
  ).slice(0, limit);
}

/** Stable Schnellzugriff keys for creation shortcuts (subset of {@link DASHBOARD_QUICK_ACTION_CATALOG}). */
export const QUICK_ACCESS_CREATE_ACTION_BINDINGS = [
  {
    stableKey: "action.create-training",
    catalogKey: "training",
    permissionKeys: [PERMISSIONS.EVENTS_MANAGE] as PermissionKey[],
  },
  {
    stableKey: "action.create-match",
    catalogKey: "match",
    permissionKeys: [PERMISSIONS.EVENTS_MANAGE] as PermissionKey[],
  },
  {
    stableKey: "action.create-tournament",
    catalogKey: "tournament",
    permissionKeys: [PERMISSIONS.EVENTS_MANAGE] as PermissionKey[],
  },
  {
    stableKey: "action.create-event",
    catalogKey: "veranstaltung",
    permissionKeys: [PERMISSIONS.EVENTS_MANAGE] as PermissionKey[],
  },
  {
    stableKey: "action.create-news",
    catalogKey: "news",
    permissionKeys: [PERMISSIONS.NEWS_MANAGE, PERMISSIONS.WEBSITE_MANAGE] as PermissionKey[],
  },
  {
    stableKey: "action.create-person",
    catalogKey: "person",
    permissionKeys: [PERMISSIONS.PEOPLE_MANAGE] as PermissionKey[],
  },
] as const;
