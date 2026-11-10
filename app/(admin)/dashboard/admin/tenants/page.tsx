import TenantCreateTrigger from "@/components/admin/tenants/TenantCreateTrigger";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenants } from "@/lib/tenants/queries";
import TenantList from "@/components/admin/tenants/TenantList";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

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
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Platform"
        title="Tenants"
        description="Alle Tenants dieser Instanz. Jeder Tenant repräsentiert eine eigenständige Vereinsinstanz."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Tenants" },
        ]}
        headerActions={canManage ? <TenantCreateTrigger /> : undefined}
      >
        <TenantList tenants={tenants} canManage={canManage} />
      </ListPagePattern>
    </PageShell>
  );
}
