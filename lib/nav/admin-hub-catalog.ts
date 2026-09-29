import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export type AdminHubCardDef = {
  key: string;
  title: string;
  description: string;
  href: string;
  permissionKeys: PermissionKey[];
  groupId: AdminHubGroupId;
};

export type AdminHubGroupId =
  | "people-access"
  | "organisation"
  | "roles"
  | "communication"
  | "club"
  | "integrations"
  | "billing";

export type AdminHubGroupDef = {
  id: AdminHubGroupId;
  title: string;
};

export const ADMIN_HUB_GROUPS: AdminHubGroupDef[] = [
  { id: "people-access", title: "Personen & Zugriffe" },
  { id: "organisation", title: "Organisation" },
  { id: "roles", title: "Rollen & Berechtigungen" },
  { id: "communication", title: "Kommunikation" },
  { id: "club", title: "Verein" },
  { id: "integrations", title: "Integrationen" },
  { id: "billing", title: "Abrechnung" },
];

/** Production-ready tenant admin destinations (no platform-only or dead links). */
export const ADMIN_HUB_CARD_CATALOG: AdminHubCardDef[] = [
  {
    key: "people-access",
    title: "Personen & Zugänge",
    description: "Wer hat Zugang — Rollen, Einladungen und Mitgliedschaften verwalten.",
    href: "/dashboard/admin/people-access",
    permissionKeys: [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE],
    groupId: "people-access",
  },
  {
    key: "roles",
    title: "Rollen & Berechtigungen",
    description: "Vereinsrollen definieren und Berechtigungen zuweisen.",
    href: "/dashboard/administration/roles",
    permissionKeys: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_MANAGE],
    groupId: "roles",
  },
  {
    key: "facilities",
    title: "Anlagen & Ressourcen",
    description: "Sportanlagen, Ressourcen und Zeitstandards pflegen.",
    href: "/dashboard/admin/facilities",
    permissionKeys: [PERMISSIONS.FACILITIES_VIEW, PERMISSIONS.FACILITIES_MANAGE],
    groupId: "organisation",
  },
  {
    key: "seasons",
    title: "Saisons",
    description: "Saisons als führende Struktur für Teams und Planung verwalten.",
    href: "/dashboard/seasons",
    permissionKeys: [PERMISSIONS.SEASONS_VIEW, PERMISSIONS.SEASONS_MANAGE],
    groupId: "organisation",
  },
  {
    key: "branding",
    title: "Darstellung",
    description: "Logo, Farben und vereinseigene Darstellung anpassen.",
    href: "/dashboard/admin/branding",
    permissionKeys: [PERMISSIONS.USERS_MANAGE],
    groupId: "club",
  },
  {
    key: "email-sender",
    title: "E-Mail-Absender",
    description: "Absenderidentitäten für vereinsweite Kommunikation verwalten.",
    href: "/dashboard/communication/email-sender",
    permissionKeys: [...TENANT_ADMINISTRATION_PERMISSIONS],
    groupId: "communication",
  },
  {
    key: "communications-admin",
    title: "Kommunikation (Administration)",
    description: "Weiterleitung zu kommunikationsbezogenen Admin-Einstellungen.",
    href: "/dashboard/admin/communications",
    permissionKeys: [...TENANT_ADMINISTRATION_PERMISSIONS],
    groupId: "communication",
  },
];

function hasAnyPermission(userKeys: readonly PermissionKey[], required: PermissionKey[]): boolean {
  return required.some((key) => userKeys.includes(key));
}

export type AdminHubGroupViewModel = AdminHubGroupDef & {
  cards: AdminHubCardDef[];
};

export function buildAdminHubGroupsForUser(
  permissionKeys: readonly PermissionKey[],
): AdminHubGroupViewModel[] {
  const visibleCards = ADMIN_HUB_CARD_CATALOG.filter((card) =>
    hasAnyPermission(permissionKeys, card.permissionKeys),
  );

  return ADMIN_HUB_GROUPS.map((group) => ({
    ...group,
    cards: visibleCards.filter((card) => card.groupId === group.id),
  })).filter((group) => group.cards.length > 0);
}
