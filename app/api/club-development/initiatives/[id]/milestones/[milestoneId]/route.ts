import { NextRequest, NextResponse } from "next/server";
import { InitiativeMilestoneStatus } from "@prisma/client";
import {
  deleteInitiativeMilestone,
  InitiativeMilestoneTenantError,
  updateInitiativeMilestone,
} from "@/lib/club-development/initiative-milestone-service";
import { getInitiativeBacklogItem } from "@/lib/club-development/initiative-backlog";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

type RouteContext = { params: Promise<{ id: string; milestoneId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([PERMISSIONS.INITIATIVES_MANAGE]);
  if (!access.ok) return access.response;
  const { id, milestoneId } = await params;
  const initiative = await getInitiativeBacklogItem(access.context.actor, id);
  if (!initiative) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const status = Object.values(InitiativeMilestoneStatus).includes(body?.status)
      ? body.status
      : undefined;
    const milestone = await updateInitiativeMilestone(access.context.tenantId, id, milestoneId, {
      title: body?.title,
      description: body?.description !== undefined ? body.description : undefined,
      targetDate:
        body?.targetDate !== undefined
          ? body.targetDate
            ? new Date(body.targetDate)
            : null
          : undefined,
      sortOrder: body?.sortOrder,
      status,
    });
    return NextResponse.json({ milestone });
  } catch (err) {
    if (err instanceof InitiativeMilestoneTenantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([PERMISSIONS.INITIATIVES_MANAGE]);
  if (!access.ok) return access.response;
  const { id, milestoneId } = await params;
  const initiative = await getInitiativeBacklogItem(access.context.actor, id);
  if (!initiative) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }

  try {
    await deleteInitiativeMilestone(access.context.tenantId, id, milestoneId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InitiativeMilestoneTenantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
