import { notFound } from "next/navigation";
import TournamentCreateForm from "@/components/admin/tournamentcenter/TournamentCreateForm";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import { PageShell } from "@/components/ui/page";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

export default async function NewTournamentCenterPage() {
  const session = await requireAnyPermission([PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.EVENTS_VIEW]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const canManageFacilitiesTimeStandards = hasPermission(session, PERMISSIONS.FACILITIES_MANAGE);

  const [facilities, operationalDurationPolicy] = await Promise.all([
    getFacilitiesForTenant(tenantContext.id),
    getTenantOperationalDurationPolicy(tenantContext.id),
  ]);

  function facilityGroupsForTypes(types: readonly string[]): FacilityGroup[] {
    return facilities
      .filter((f) => f.status !== "ARCHIVED")
      .map((f) => ({
        facilityId: f.id,
        facilityName: f.name,
        facilityType: f.type as string,
        resources: f.resources
          .filter((r) => r.status !== "ARCHIVED" && types.includes(r.type))
          .map((r) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            type: r.type,
            facilityId: f.id,
            facilityName: f.name,
            facilityType: f.type as string,
          })),
      }))
      .filter((fg) => fg.resources.length > 0);
  }

  const pitchHallFacilityGroups = facilityGroupsForTypes(["FULL_PITCH", "HALF_PITCH"]);
  const dressingRoomFacilityGroups = facilityGroupsForTypes(["DRESSING_ROOM"]);

  return (
    <PageShell fullWidth>
      <TournamentCreateForm
        pitchHallFacilityGroups={pitchHallFacilityGroups}
        dressingRoomFacilityGroups={dressingRoomFacilityGroups}
        tenantLogoUrl={tenantContext.logoUrl}
        defaultTournamentDurationMinutes={operationalDurationPolicy.TOURNAMENT.durationMinutes}
        canManageFacilitiesTimeStandards={canManageFacilitiesTimeStandards}
      />
    </PageShell>
  );
}
