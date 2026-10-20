import Link from "next/link";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { Plus } from "lucide-react";
import { requireActiveTenantId } from "@/lib/tenants/active-tenant";
import { getTenantRolesOverview } from "@/lib/roles/tenant-queries";
import TenantRolesOverviewDenseTable from "@/components/admin/roles/TenantRolesOverviewDenseTable";
import { SceEmptyState } from "@/components/sce/feedback/SceEmptyState";

export default async function TenantRolesOverviewPage() {
  // Permission + tenant-context guard is already enforced by the parent
  // layout.tsx — re-resolving the tenant id here only to scope the query,
  // never to re-derive authorization.
  const tenantId = await requireActiveTenantId();
  const roles = await getTenantRolesOverview(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Link href="/dashboard/administration/roles/new" className="fca-button-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Neue Rolle
        </Link>
      </div>

      {roles.length === 0 ? (
        <SceEmptyState
          variant="FIRST_USE"
          layout="compact-stacked"
          icon={<ProductDomainSceIcon name="roles-access" size={24} />}
          title="Keine Rollen vorhanden"
          description="Erstelle die erste mandanten-eigene Rolle für diesen Verein."
          primaryAction={
            <Link href="/dashboard/administration/roles/new" className="fca-button-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Neue Rolle
            </Link>
          }
          data-testid="roles-empty-first-use"
        />
      ) : (
        <TenantRolesOverviewDenseTable roles={roles} />
      )}
    </div>
  );
}
