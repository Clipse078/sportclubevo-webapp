import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { requireActiveTenantId } from "@/lib/tenants/active-tenant";
import { TENANT_ROLES_MANAGE } from "@/lib/roles/access";
import {
  getActorDelegatableTenantPermissionKeys,
  getTenantPermissionCatalog,
  getTenantRolesOverview,
} from "@/lib/roles/tenant-queries";
import TenantRolesOverviewDenseTable from "@/components/admin/roles/TenantRolesOverviewDenseTable";
import CreateTenantRoleTrigger from "@/components/admin/roles/CreateTenantRoleTrigger";
import { SceEmptyState } from "@/components/sce/feedback/SceEmptyState";
import { SCE_DENSE_OPERATIONAL_PAGE_ROOT_CLASS } from "@/lib/design-system/sce-density-border-micro-ux";
import { SCE_WORKSPACE_HEADER_ACTIONS_CLASS } from "@/lib/design-system/sce-responsive-accessibility-micro-ux";

export default async function TenantRolesOverviewPage() {
  const tenantId = await requireActiveTenantId();
  const session = await requireAnyPermission(TENANT_ROLES_MANAGE, tenantId);

  const [roles, moduleGroups, actorDelegatablePermissionKeys] = await Promise.all([
    getTenantRolesOverview(tenantId),
    getTenantPermissionCatalog(),
    getActorDelegatableTenantPermissionKeys(tenantId, session.user.id),
  ]);

  return (
    <div className={SCE_DENSE_OPERATIONAL_PAGE_ROOT_CLASS} data-testid="roles-overview-page-root">
      <div className={SCE_WORKSPACE_HEADER_ACTIONS_CLASS}>
        <CreateTenantRoleTrigger
          moduleGroups={moduleGroups}
          actorDelegatablePermissionKeys={actorDelegatablePermissionKeys}
        />
      </div>

      {roles.length === 0 ? (
        <SceEmptyState
          variant="FIRST_USE"
          layout="compact-stacked"
          icon={<ProductDomainSceIcon name="roles-access" size={24} />}
          title="Keine Rollen vorhanden"
          description="Erstelle die erste mandanten-eigene Rolle für diesen Verein."
          primaryAction={
            <CreateTenantRoleTrigger
              moduleGroups={moduleGroups}
              actorDelegatablePermissionKeys={actorDelegatablePermissionKeys}
            />
          }
          data-testid="roles-empty-first-use"
        />
      ) : (
        <TenantRolesOverviewDenseTable roles={roles} />
      )}
    </div>
  );
}
