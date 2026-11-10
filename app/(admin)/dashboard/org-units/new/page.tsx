import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getOrgUnits } from "@/lib/org/queries";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import OrgUnitForm from "@/components/admin/org/OrgUnitForm";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

// RPERM-04: tenant resolved via the single tenant-context helper (session.activeTenantId,
// derived from TenantMembership — never the legacy User.tenantId column).

export default async function NewOrgUnitPage() {
  await requireAnyPermission([PERMISSIONS.ORG_MANAGE]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();
  const parentOptions = await getOrgUnits(tenant.id);

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Organisation"
        title="Neue Organisationseinheit"
        description="Erstelle eine Einheit im Organigramm des Vereins."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Organisation", href: "/dashboard/org-units" },
          { label: "Neu" },
        ]}
      >
        <OrgUnitForm mode="create" layout="composer" parentOptions={parentOptions} />
      </FormPagePattern>
    </PageShell>
  );
}
