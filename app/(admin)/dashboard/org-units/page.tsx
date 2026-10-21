import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getOrgUnits, getArchivedOrgUnits } from "@/lib/org/queries";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import OrgUnitBuilderWorkspace from "@/components/admin/org/OrgUnitBuilderWorkspace";
import { ListPagePattern } from "@/components/ui/patterns";
import { PageShell } from "@/components/ui/page";

type PageProps = { searchParams: Promise<{ view?: string }> };

export default async function OrgUnitsPage({ searchParams }: PageProps) {
  const session = await requireAnyPermission([PERMISSIONS.ORG_VIEW, PERMISSIONS.ORG_MANAGE]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const { view } = await searchParams;
  const showArchived = view === "archived";
  const canManage = hasPermission(session, PERMISSIONS.ORG_MANAGE);

  const [orgUnits, archivedOrgUnits] = await Promise.all([
    getOrgUnits(tenant.id),
    canManage ? getArchivedOrgUnits(tenant.id) : Promise.resolve([]),
  ]);

  const parentOptions = orgUnits.map((u) => ({
    id: u.id,
    key: u.key,
    name: u.name,
    level: u.level,
    type: u.type,
  }));

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Organisation"
        title="Organisation Builder"
        description="Visuelles Organigramm — Hierarchie, Mitglieder und Berechtigungen auf autoritativen OrgUnit-Daten."
      >
        <OrgUnitBuilderWorkspace
          tenantId={tenant.id}
          orgUnits={orgUnits}
          archivedOrgUnits={archivedOrgUnits}
          showArchived={showArchived}
          canManage={canManage}
          parentOptions={parentOptions}
        />
      </ListPagePattern>
    </PageShell>
  );
}
