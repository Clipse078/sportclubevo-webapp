import { NextRequest, NextResponse } from "next/server";
import {
  createInitiativeMilestone,
  InitiativeMilestoneTenantError,
  listInitiativeMilestones,
} from "@/lib/club-development/initiative-milestone-service";
import { getInitiativeBacklogItem } from "@/lib/club-development/initiative-backlog";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const { id } = await params;
  const initiative = await getInitiativeBacklogItem(access.context.actor, id);
  if (!initiative) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }
  const milestones = await listInitiativeMilestones(access.context.tenantId, id);
  return NextResponse.json({ milestones });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([PERMISSIONS.INITIATIVES_MANAGE]);
  if (!access.ok) return access.response;
  const { id } = await params;
  const initiative = await getInitiativeBacklogItem(access.context.actor, id);
  if (!initiative) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const milestone = await createInitiativeMilestone(access.context.tenantId, id, {
      title: body?.title ?? "",
      description: body?.description,
      targetDate: body?.targetDate ? new Date(body.targetDate) : null,
      sortOrder: body?.sortOrder,
    });
    return NextResponse.json({ milestone }, { status: 201 });
  } catch (err) {
    if (err instanceof InitiativeMilestoneTenantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
