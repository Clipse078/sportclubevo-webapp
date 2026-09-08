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

const QUICK_ACTION_CATALOG: DashboardQuickActionDef[] = [
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

/** Returns up to four quick actions the actor may use. */
export function getDashboardQuickActionDefs(
  permissionKeys: PermissionKey[],
  limit = 4,
): DashboardQuickActionDef[] {
  return QUICK_ACTION_CATALOG.filter((action) =>
    hasAccess(permissionKeys, action.permissionKeys),
  ).slice(0, limit);
}
