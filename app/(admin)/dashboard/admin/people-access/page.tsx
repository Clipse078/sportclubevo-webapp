import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { getTenantUsersListData, getTenantPersonsWithoutUser } from "@/lib/users/queries";
import { getTenantPermissionCatalog, getTenantRolesOverview } from "@/lib/roles/tenant-queries";
import { getOrgUnitsForTenant } from "@/lib/people/queries";
import { getTenantClubAdminRoleKey } from "@/lib/roles/tenant-role-keys";
import { getPrivilegedTenantRoleIds } from "@/lib/admin/people-access/privileged";
import { prisma } from "@/lib/db/prisma";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import TenantUsersSearchableList from "@/components/admin/users/TenantUsersSearchableList";
import { actorHasImpersonateTenantPermission } from "@/lib/admin/users/tenant-impersonation";
import ClubEventGovernancePeopleAccessView from "@/components/admin/users/people-access/ClubEventGovernancePeopleAccessView";
import {
  buildClubEventCreatorGovernanceRows,
  parseClubEventGovernancePeopleAccessContext,
  tenantRoleIdsGrantingPermission,
} from "@/lib/club-events/governance/club-event-governance-people-access-context";
import { tenantCanAdministerClubEventGovernance } from "@/lib/club-events/governance/resolve-club-event-freigaben-access";
import { loadSceActivityClubGovernancePolicy } from "@/lib/sce/activity-governance/persistence/load-club-governance-policy";

type PageProps = {
  searchParams?: Promise<{ context?: string | string[] }>;
};

export default async function PeopleAccessPage({ searchParams }: PageProps) {
  const session = await requireAnyPermission([
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_MANAGE,
  ]);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const clubEventGovernanceContext = parseClubEventGovernancePeopleAccessContext(
    resolvedSearchParams?.context,
  );

  const actorUserId = session.user.actorUserId ?? session.user.id;
  const currentUserId = session.user.effectiveUserId ?? session.user.id;
  const canImpersonateTenant =
    !session.user.isImpersonating &&
    (await actorHasImpersonateTenantPermission(actorUserId, tenantId));
  const canInvite = hasPermission(session, PERMISSIONS.USERS_INVITE);
  const canManage =
    hasPermission(session, PERMISSIONS.USERS_MANAGE_MEMBERSHIPS) ||
    hasPermission(session, PERMISSIONS.USERS_MANAGE);
  const canGlobalDelete = hasPermission(session, PERMISSIONS.USERS_DELETE);

  if (clubEventGovernanceContext) {
    const { platform, tenant: tenantPermissions } = await getRequestEffectivePermissions(
      session.user.id,
      tenantId,
    );
    const mayAdministerGovernance = tenantCanAdministerClubEventGovernance(
      platform as readonly PermissionKey[],
      tenantPermissions as readonly PermissionKey[],
    );
    if (!mayAdministerGovernance) {
      notFound();
    }

    const [users, personsWithoutUser, policy, rolePermissionRows] = await Promise.all([
      getTenantUsersListData(tenantId).catch(() => []),
      getTenantPersonsWithoutUser(tenantId).catch(() => []),
      loadSceActivityClubGovernancePolicy(tenantId),
      prisma.rolePermission.findMany({
        where: {
          role: { scope: "TENANT", tenantId },
          permission: { key: PERMISSIONS.EVENTS_MANAGE },
        },
        select: {
          roleId: true,
          permission: { select: { key: true } },
        },
      }),
    ]);

    const clubEventTypePolicy = policy.activityTypes.find(
      (row) => row.activityType === "CLUB_EVENT",
    );
    const roleIdsWithEventsManage = tenantRoleIdsGrantingPermission(
      rolePermissionRows.map((row) => ({
        roleId: row.roleId,
        permissionKey: row.permission.key as PermissionKey,
      })),
      PERMISSIONS.EVENTS_MANAGE,
    );
    const creatorRows = buildClubEventCreatorGovernanceRows({
      clubEventTypePolicy,
      users,
      personsWithoutUser,
      roleIdsWithEventsManage,
    });

    return (
      <ClubEventGovernancePeopleAccessView canManage={canManage} creatorRows={creatorRows} />
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { key: true },
  });
  if (!tenant) notFound();

  const [users, personsWithoutUser, roles, orgUnits, privilegedRoleIds, permissionModuleGroups] =
    await Promise.all([
    getTenantUsersListData(tenantId).catch(() => []),
    getTenantPersonsWithoutUser(tenantId).catch(() => []),
    getTenantRolesOverview(tenantId).catch(() => []),
    getOrgUnitsForTenant(tenantId).catch(() => []),
    getPrivilegedTenantRoleIds(tenantId).catch(() => []),
    getTenantPermissionCatalog().catch(() => []),
  ]);

  const wizardConfig = {
    availableRoles: roles
      .filter((r) => !r.isArchived)
      .map((r) => ({
        id: r.id,
        name: r.name,
        key: r.key,
        isSystem: r.isSystem,
        description: r.description,
      })),
    availableOrgUnits: orgUnits.map((u) => ({ id: u.id, name: u.name })),
    clubAdminRoleKey: getTenantClubAdminRoleKey(tenant.key),
    privilegedRoleIds,
    permissionModuleGroups,
  };

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Administration"
        title="Personen & Zugänge"
        description="Personen einladen, Rollen zuweisen und Zugriffe verwalten."
      />
      <TenantUsersSearchableList
        initialUsers={users}
        personsWithoutUser={personsWithoutUser}
        currentUserId={currentUserId}
        actorUserId={actorUserId}
        canImpersonateTenant={canImpersonateTenant}
        canInvite={canInvite}
        canManage={canManage}
        canGlobalDelete={canGlobalDelete}
        wizardConfig={wizardConfig}
      />
    </div>
  );
}
