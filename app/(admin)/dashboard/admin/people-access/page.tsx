import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantUsersListData, getTenantPersonsWithoutUser } from "@/lib/users/queries";
import { getTenantPermissionCatalog, getTenantRolesOverview } from "@/lib/roles/tenant-queries";
import { getOrgUnitsForTenant } from "@/lib/people/queries";
import { getTenantClubAdminRoleKey } from "@/lib/roles/tenant-role-keys";
import { getPrivilegedTenantRoleIds } from "@/lib/admin/people-access/privileged";
import { prisma } from "@/lib/db/prisma";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import TenantUsersSearchableList from "@/components/admin/users/TenantUsersSearchableList";
import { actorHasImpersonateTenantPermission } from "@/lib/admin/users/tenant-impersonation";

export default async function PeopleAccessPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_MANAGE,
  ]);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

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
