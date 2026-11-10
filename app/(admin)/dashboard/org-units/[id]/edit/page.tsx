import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getOrgUnitById, getOrgUnits } from "@/lib/org/queries";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import OrgUnitForm from "@/components/admin/org/OrgUnitForm";
import OrgUnitRecordTabs from "@/components/admin/org/OrgUnitRecordTabs";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

// RPERM-04: tenant resolved via the single tenant-context helper (session.activeTenantId,
// derived from TenantMembership — never the legacy User.tenantId column).

type PageProps = { params: Promise<{ id: string }> };

export default async function EditOrgUnitPage({ params }: PageProps) {
  await requireAnyPermission([PERMISSIONS.ORG_MANAGE]);

  const { id } = await params;
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const [unit, parentOptions] = await Promise.all([
    getOrgUnitById(id),
    getOrgUnits(tenant.id),
  ]);

  if (!unit) notFound();
  // Tenant guard: null tenantId = pre-migration residue; allow (backwards-compat).
  if (unit.tenantId !== null && unit.tenantId !== tenant.id) notFound();

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Organisation"
        title={`${unit.name} bearbeiten`}
        description="Passe Stammdaten der Organisationseinheit an. Der Key bleibt unveränderlich."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Organisation", href: "/dashboard/org-units" },
          { label: unit.name, href: `/dashboard/org-units/${unit.id}` },
          { label: "Bearbeiten" },
        ]}
        contextTabs={<OrgUnitRecordTabs orgUnitId={unit.id} />}
        cancelAction={
          <Link href={`/dashboard/org-units/${unit.id}`} className="fca-button-secondary">
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
        }
      >
      <OrgUnitForm
        mode="edit"
        orgUnitId={unit.id}
        parentOptions={parentOptions}
        defaultValues={{
          name: unit.name,
          key: unit.key,
          type: unit.type,
          parentId: unit.parentId ?? "",
          description: unit.description ?? "",
          sortOrder: unit.sortOrder,
          status: unit.status,
        }}
      />
      </FormPagePattern>
    </PageShell>
  );
}
