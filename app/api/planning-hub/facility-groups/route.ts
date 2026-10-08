import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS } from "@/lib/permissions/planning-allocation-permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getFacilitiesForTenantCached } from "@/lib/server/request-cache";
import { buildFacilityGroupsByAllocationGroupFromFacilities } from "@/lib/planning-hub/facility-groups";

/**
 * Lazy facility-group payload for Planning Hub edit/manipulation surfaces.
 * Keeps the initial Kalender RSC response smaller (VIEW FIRST).
 */
export async function GET() {
  await requireAnyPermission([...PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS]);

  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  const facilities = await getFacilitiesForTenantCached(tenant.id);
  return NextResponse.json(buildFacilityGroupsByAllocationGroupFromFacilities(facilities));
}
