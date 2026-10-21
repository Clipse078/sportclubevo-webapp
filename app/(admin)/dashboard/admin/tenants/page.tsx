import TenantCreateTrigger from "@/components/admin/tenants/TenantCreateTrigger";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenants } from "@/lib/tenants/queries";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import TenantList from "@/components/admin/tenants/TenantList";

export default async function TenantsPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.TENANTS_VIEW,
    PERMISSIONS.TENANTS_MANAGE,
  ]);
  const canManage = hasPermission(session, PERMISSIONS.TENANTS_MANAGE);

  let tenants: Awaited<ReturnType<typeof getTenants>> = [];
  try {
    tenants = await getTenants();
  } catch {
    // DB schema drift or connection failure — render page with empty list
    // so the admin can still navigate and diagnose via /dashboard/runtime.
    tenants = [];
  }

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Platform"
        title="Tenants"
        description="Alle Tenants dieser Instanz. Jeder Tenant repräsentiert eine eigenständige Vereinsinstanz."
        actions={
          canManage ? <TenantCreateTrigger /> : undefined
        }
      />

      <TenantList tenants={tenants} canManage={canManage} />
    </div>
  );
}
