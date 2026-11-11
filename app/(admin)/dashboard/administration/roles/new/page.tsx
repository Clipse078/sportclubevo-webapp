import Link from "next/link";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { requireActiveTenantId } from "@/lib/tenants/active-tenant";
import { TENANT_ROLES_MANAGE } from "@/lib/roles/access";
import {
  getActorDelegatableTenantPermissionKeys,
  getTenantPermissionCatalog,
} from "@/lib/roles/tenant-queries";
import CreateTenantRoleForm from "@/components/admin/roles/CreateTenantRoleForm";

export default async function NewTenantRolePage() {
  const tenantId = await requireActiveTenantId();
  const session = await requireAnyPermission(TENANT_ROLES_MANAGE, tenantId);

  const [moduleGroups, actorDelegatablePermissionKeys] = await Promise.all([
    getTenantPermissionCatalog(),
    getActorDelegatableTenantPermissionKeys(tenantId, session.user.id),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[var(--muted)]">Neue Rolle</p>
          <h2 className="sce-type-page-title text-lg">Neue Rolle erstellen</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-2)]">
            Definiere eine Rolle und wähle die passenden Berechtigungen aus.
          </p>
        </div>
        <Link href="/dashboard/administration/roles" className="fca-button-secondary shrink-0 self-start">
          Zurück zur Übersicht
        </Link>
      </div>
      <CreateTenantRoleForm
        moduleGroups={moduleGroups}
        actorDelegatablePermissionKeys={actorDelegatablePermissionKeys}
        layout="composer"
      />
    </div>
  );
}
