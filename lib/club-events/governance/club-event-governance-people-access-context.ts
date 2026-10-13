import type { PermissionKey } from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { SceActivityTypeGovernancePolicy } from "@/lib/sce/activity-governance/types";
import type { TenantPersonWithoutUser, TenantUserItem } from "@/lib/users/queries";

/** Query value for Personen & Zugänge Club Event governance administration entry. */
export const CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT = "club-event-governance" as const;

export const CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF =
  `/dashboard/admin/people-access?context=${CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT}` as const;

export const CLUB_EVENT_FREIGABEN_HREF = "/dashboard/veranstaltungen/freigaben" as const;

export function parseClubEventGovernancePeopleAccessContext(
  raw: string | string[] | undefined,
): boolean {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT;
}

export function parseClubEventGovernanceReturnContext(
  raw: string | string[] | undefined,
): boolean {
  return parseClubEventGovernancePeopleAccessContext(raw);
}

export function buildClubEventGovernanceUserDetailHref(userId: string): string {
  return `/dashboard/admin/users/${encodeURIComponent(userId)}?returnContext=${CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT}&tab=veranstaltungs-freigaben`;
}

export type ClubEventCreatorGovernanceRow = {
  personId: string;
  displayName: string;
  userId: string | null;
  createLabel: "Ja" | "Nein";
  publicationLabel: "Direkt" | "Freigabe erforderlich" | "—";
};

function personDisplayName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

function userHasEventsManageRole(
  user: TenantUserItem,
  roleIdsWithEventsManage: ReadonlySet<string>,
): boolean {
  const roleIds = [
    ...user.roles.map((r) => r.id),
    ...user.scopedRoles.map((r) => r.id),
  ];
  return roleIds.some((id) => roleIdsWithEventsManage.has(id));
}

/**
 * Discoverable creator rows for governance administration — same policy store as person detail.
 */
export function buildClubEventCreatorGovernanceRows(input: {
  clubEventTypePolicy: SceActivityTypeGovernancePolicy | undefined;
  users: readonly TenantUserItem[];
  personsWithoutUser: readonly TenantPersonWithoutUser[];
  roleIdsWithEventsManage: ReadonlySet<string>;
}): ClubEventCreatorGovernanceRow[] {
  const typePolicy = input.clubEventTypePolicy;
  const defaultPublication = typePolicy?.defaultPublicationAuthority ?? "DIRECT_PUBLISH";
  const creatorByPersonId = new Map(
    (typePolicy?.creatorPolicies ?? []).map((p) => [p.personId, p]),
  );

  const nameByPersonId = new Map<string, string>();
  for (const person of input.personsWithoutUser) {
    nameByPersonId.set(person.personId, personDisplayName(person.firstName, person.lastName));
  }

  const rows: ClubEventCreatorGovernanceRow[] = [];
  const seenPersonIds = new Set<string>();

  for (const user of input.users) {
    const personId = user.linkedPersonId;
    if (!personId) continue;

    const creatorPolicy = creatorByPersonId.get(personId);
    const hasEventsManage = userHasEventsManageRole(user, input.roleIdsWithEventsManage);
    if (!hasEventsManage && !creatorPolicy) {
      continue;
    }

    seenPersonIds.add(personId);
    const displayName =
      user.linkedPersonName ?? personDisplayName(user.firstName, user.lastName);
    nameByPersonId.set(personId, displayName);

    const createEnabled =
      creatorPolicy?.createEnabled !== false && (hasEventsManage || creatorPolicy?.createEnabled === true);
    const createLabel: "Ja" | "Nein" = createEnabled ? "Ja" : "Nein";
    const publicationAuthority =
      creatorPolicy?.publicationAuthority ?? defaultPublication;
    const publicationLabel: ClubEventCreatorGovernanceRow["publicationLabel"] = createEnabled
      ? publicationAuthority === "APPROVAL_REQUIRED"
        ? "Freigabe erforderlich"
        : "Direkt"
      : "—";

    rows.push({
      personId,
      displayName,
      userId: user.userId,
      createLabel,
      publicationLabel,
    });
  }

  for (const creatorPolicy of typePolicy?.creatorPolicies ?? []) {
    if (seenPersonIds.has(creatorPolicy.personId)) continue;
    const displayName =
      nameByPersonId.get(creatorPolicy.personId) ?? "Unbekannte Person";
    const createEnabled = creatorPolicy.createEnabled !== false;
    const createLabel: "Ja" | "Nein" = createEnabled ? "Ja" : "Nein";
    const publicationLabel: ClubEventCreatorGovernanceRow["publicationLabel"] = createEnabled
      ? creatorPolicy.publicationAuthority === "APPROVAL_REQUIRED"
        ? "Freigabe erforderlich"
        : "Direkt"
      : "—";
    rows.push({
      personId: creatorPolicy.personId,
      displayName,
      userId: null,
      createLabel,
      publicationLabel,
    });
  }

  rows.sort((a, b) => a.displayName.localeCompare(b.displayName, "de"));
  return rows;
}

export function tenantRoleIdsGrantingPermission(
  rolePermissions: readonly { roleId: string; permissionKey: PermissionKey }[],
  permissionKey: PermissionKey,
): Set<string> {
  return new Set(
    rolePermissions.filter((row) => row.permissionKey === permissionKey).map((row) => row.roleId),
  );
}
