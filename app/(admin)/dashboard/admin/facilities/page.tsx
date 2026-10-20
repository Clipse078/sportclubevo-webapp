import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import { diagnoseTenantFacilityIntegrity } from "@/lib/facilities/facility-integrity-diagnosis";
import FacilitiesAdminPanel from "@/components/admin/facilities/FacilitiesAdminPanel";
import { FacilityIntegrityAlerts } from "@/components/admin/facilities/FacilityIntegrityAlerts";
import FacilitiesOperationalSettingsPanel from "@/components/admin/facilities/FacilitiesOperationalSettingsPanel";
import { getTenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/tenant-preset-service";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import { PageShell } from "@/components/ui/page";
import { SceInformationSurface } from "@/components/sce/information";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";

export default async function FacilitiesPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.FACILITIES_VIEW,
    PERMISSIONS.FACILITIES_MANAGE,
  ]);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

  const canManage = hasPermission(session, PERMISSIONS.FACILITIES_MANAGE);
  const canDelete = hasPermission(session, PERMISSIONS.FACILITIES_DELETE);

  let facilities: Awaited<ReturnType<typeof getFacilitiesForTenant>> = [];
  try {
    facilities = await getFacilitiesForTenant(tenantId);
  } catch {
    facilities = [];
  }

  const [dressingRoomPresets, operationalDurationPolicy] = await Promise.all([
    getTenantDressingRoomOccupancyPresets(tenantId),
    getTenantOperationalDurationPolicy(tenantId),
  ]);

  const integrityFindings = diagnoseTenantFacilityIntegrity(
    facilities.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      status: f.status,
      resources: f.resources.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        status: r.status,
      })),
    })),
  );

  return (
    <PageShell widthMode="operational">
      <SceWorkspaceChrome
        density="dense"
        breadcrumbs={[
          { label: "Administration", href: "/dashboard/admin" },
          { label: "Anlagen & Ressourcen" },
        ]}
        header={{
          eyebrow: "Administration",
          title: "Anlagen & Ressourcen",
          description:
            "Sportanlagen, Plätze und Garderoben konfigurieren. Einmal gepflegt, werden die Bezeichnungen automatisch auf dem Infoboard und in der Wochenplanung verwendet.",
        }}
      >
        <SceInformationSurface variant="flat" testId="facilities-admin-surface">
          <div className="space-y-8">
            <FacilitiesOperationalSettingsPanel
              initialPolicy={operationalDurationPolicy}
              initialPresets={dressingRoomPresets}
              canManage={canManage}
            />

            <FacilityIntegrityAlerts findings={integrityFindings} />

            <FacilitiesAdminPanel
              initialFacilities={facilities}
              canManage={canManage}
              canDelete={canDelete}
              tenantId={tenantId}
            />
          </div>
        </SceInformationSurface>
      </SceWorkspaceChrome>
    </PageShell>
  );
}
