import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantPersonsWithoutUser } from "@/lib/users/queries";
import { getTenantRolesOverview } from "@/lib/roles/tenant-queries";
import { getOrgUnitsForTenant } from "@/lib/people/queries";
import { getTenantClubAdminRoleKey } from "@/lib/roles/tenant-role-keys";
import { prisma } from "@/lib/db/prisma";
import AddPersonAccessFlow from "@/components/admin/users/AddPersonAccessFlow";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

export default async function AddPersonAccessPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.USERS_INVITE,
    PERMISSIONS.USERS_MANAGE,
  ]);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { key: true },
  });
  if (!tenant) notFound();

  const [roles, orgUnits, personsWithoutUser] = await Promise.all([
    getTenantRolesOverview(tenantId),
    getOrgUnitsForTenant(tenantId),
    getTenantPersonsWithoutUser(tenantId).catch(() => []),
  ]);

  const availableRoles = roles
    .filter((r) => !r.isArchived)
    .map((r) => ({ id: r.id, name: r.name, key: r.key, isSystem: r.isSystem }));

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Administration"
        title="Person hinzufügen"
        description="Person anlegen, Zugriff zuweisen und optional eine Einladung senden — ohne temporäres Passwort."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Administration", href: "/dashboard/admin" },
          { label: "Personen & Zugänge", href: "/dashboard/admin/people-access" },
          { label: "Person hinzufügen" },
        ]}
      >
        <AddPersonAccessFlow
          availableRoles={availableRoles}
          availableOrgUnits={orgUnits.map((u) => ({ id: u.id, name: u.name }))}
          personsWithoutUser={personsWithoutUser}
          clubAdminRoleKey={getTenantClubAdminRoleKey(tenant.key)}
        />
      </FormPagePattern>
    </PageShell>
  );
}
