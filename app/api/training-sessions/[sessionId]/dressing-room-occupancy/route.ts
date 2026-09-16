import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { updateTrainingSessionDressingRoomOccupancy } from "@/lib/dressing-room-occupancy/event-occupancy-service";
import { DressingRoomOccupancyValidationError } from "@/lib/dressing-room-occupancy/validation";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireApiPermission(PERMISSIONS.TRAININGS_MANAGE);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant required" }, { status: 400 });
  }

  const { sessionId } = await params;
  const body = (await req.json()) as {
    mode?: "DEFAULT" | "CUSTOM";
    beforeMinutes?: number | null;
    afterMinutes?: number | null;
  };

  try {
    await updateTrainingSessionDressingRoomOccupancy(tenantId, sessionId, {
      mode: body.mode ?? "DEFAULT",
      beforeMinutes: body.beforeMinutes,
      afterMinutes: body.afterMinutes,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DressingRoomOccupancyValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
