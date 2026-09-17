import { NextRequest, NextResponse } from "next/server";
import { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isMeaningfulEventInterval } from "@/lib/facilities/resource-occupancy-window";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireApiTenantPermissionContext } from "@/lib/permissions/require-api-tenant-context";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireApiTenantPermissionContext([
    PERMISSIONS.WOCHENPLAN_MANAGE,
    PERMISSIONS.EVENTS_MANAGE,
  ]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const tenantId = auth.context.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant required" }, { status: 400 });
  }

  const { eventId } = await context.params;
  const body = (await req.json()) as {
    operationalEndAtOverride?: string | null;
    reset?: boolean;
  };

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId, type: EventType.MATCH },
    select: { id: true, startAt: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 });
  }

  if (body.reset) {
    await prisma.event.update({
      where: { id: eventId, tenantId },
      data: { operationalEndAtOverride: null },
    });
    return NextResponse.json({ operationalEndAtOverride: null });
  }

  const raw = body.operationalEndAtOverride;
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) {
    return NextResponse.json({ error: "Endzeit erforderlich" }, { status: 400 });
  }

  const overrideEnd = new Date(raw);
  if (Number.isNaN(overrideEnd.getTime())) {
    return NextResponse.json({ error: "Ungültige Endzeit" }, { status: 400 });
  }
  if (!isMeaningfulEventInterval(event.startAt, overrideEnd)) {
    return NextResponse.json(
      { error: "Die Endzeit muss nach dem Beginn liegen." },
      { status: 400 },
    );
  }

  const updated = await prisma.event.update({
    where: { id: eventId, tenantId },
    data: { operationalEndAtOverride: overrideEnd },
    select: { operationalEndAtOverride: true },
  });

  return NextResponse.json({
    operationalEndAtOverride: updated.operationalEndAtOverride?.toISOString() ?? null,
  });
}
