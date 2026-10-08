import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  createFacilityResource,
  getFacilityResourcesForFacility,
  getFacilityById,
} from "@/lib/facilities/queries";
import type { FacilityResourceType } from "@prisma/client";
import { facilityLifecycleErrorResponse } from "@/lib/facilities/facility-lifecycle-http";
import { normalizeFacilityResourceCode } from "@/lib/facilities/facility-resource-reference-guard";

const ALLOWED_TYPES: FacilityResourceType[] = [
  "FULL_PITCH",
  "HALF_PITCH",
  "DRESSING_ROOM",
  "OTHER",
];

type Params = { params: Promise<{ facilityId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireApiAnyPermission([
    PERMISSIONS.FACILITIES_VIEW,
    PERMISSIONS.FACILITIES_MANAGE,
  ]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const { facilityId } = await params;

  const resources = await getFacilityResourcesForFacility(facilityId, tenantId);
  if (resources === null) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  return NextResponse.json({ resources });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireApiAnyPermission([PERMISSIONS.FACILITIES_MANAGE]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const { facilityId } = await params;

  // Verify the facility exists and belongs to this tenant before creating a resource.
  // Without this check, a crafted request could attach a resource to another tenant's
  // facility, causing the resource to disappear from this tenant's list.
  const facility = await getFacilityById(facilityId, tenantId);
  if (!facility) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const type: FacilityResourceType = ALLOWED_TYPES.includes(body.type) ? body.type : "OTHER";

  try {
    const resource = await createFacilityResource({
      tenantId,
      facilityId,
      name: body.name.trim(),
      code: normalizeFacilityResourceCode(body.code),
      type,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    });
    return NextResponse.json({ resource }, { status: 201 });
  } catch (err) {
    const lifecycle = facilityLifecycleErrorResponse(err);
    if (lifecycle) return lifecycle;
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Eine Ressource mit diesem Code existiert in diesem Mandanten bereits.", code: "DUPLICATE_RESOURCE" },
        { status: 409 },
      );
    }
    throw err;
  }
}
