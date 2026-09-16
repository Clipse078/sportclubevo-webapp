import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  getTenantDressingRoomOccupancyPresets,
  upsertTenantDressingRoomOccupancyPresets,
} from "@/lib/dressing-room-occupancy/tenant-preset-service";
import { DressingRoomOccupancyValidationError } from "@/lib/dressing-room-occupancy/validation";

export async function GET() {
  const auth = await requireApiPermission(PERMISSIONS.FACILITIES_VIEW);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant required" }, { status: 400 });
  }
  const presets = await getTenantDressingRoomOccupancyPresets(tenantId);
  return NextResponse.json({ presets });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiPermission(PERMISSIONS.FACILITIES_MANAGE);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant required" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Record<string, number>;
    const presets = await upsertTenantDressingRoomOccupancyPresets(tenantId, {
      trainingBeforeMinutes: body.trainingBeforeMinutes,
      trainingAfterMinutes: body.trainingAfterMinutes,
      matchBeforeMinutes: body.matchBeforeMinutes,
      matchAfterMinutes: body.matchAfterMinutes,
      tournamentBeforeMinutes: body.tournamentBeforeMinutes,
      tournamentAfterMinutes: body.tournamentAfterMinutes,
    });
    return NextResponse.json({ presets });
  } catch (err) {
    if (err instanceof DressingRoomOccupancyValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
