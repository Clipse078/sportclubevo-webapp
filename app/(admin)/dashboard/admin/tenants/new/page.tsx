import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import TenantForm from "@/components/admin/tenants/TenantForm";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

export default async function NewTenantPage() {
  await requirePermission(PERMISSIONS.TENANTS_MANAGE);

  return (
    <PageShell>
      <FormPagePattern
        eyebrow="Platform"
        title="Neuer Tenant"
        description="Erstelle eine neue Vereinsinstanz auf dieser Plattform."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Tenants", href: "/dashboard/admin/tenants" },
          { label: "Neuer Tenant" },
        ]}
      >
        <TenantForm mode="create" />
      </FormPagePattern>
    </PageShell>
  );
}
