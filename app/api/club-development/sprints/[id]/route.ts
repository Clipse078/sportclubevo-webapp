import { NextRequest, NextResponse } from "next/server";
import { DevelopmentSprintStatus, VisibilityScope } from "@prisma/client";
import {
  getDevelopmentSprintById,
  hasSprintManagePermission,
} from "@/lib/club-development/sprints/queries";
import { updateDevelopmentSprint, SprintServiceError } from "@/lib/club-development/sprints/sprint-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const { id } = await params;
  const sprint = await getDevelopmentSprintById(id, access.context.actor);
  if (!sprint) {
    return NextResponse.json({ error: "Sprint nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ sprint });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  if (!hasSprintManagePermission(access.context.actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getDevelopmentSprintById(id, access.context.actor);
  if (!existing) {
    return NextResponse.json({ error: "Sprint nicht gefunden." }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const sprint = await updateDevelopmentSprint(access.context.tenantId, id, {
      title: body?.title,
      goal: body?.goal !== undefined ? body.goal : undefined,
      status: Object.values(DevelopmentSprintStatus).includes(body?.status)
        ? body.status
        : undefined,
      owner: body?.owner !== undefined ? body.owner : undefined,
      ownerPersonId: body?.ownerPersonId !== undefined ? body.ownerPersonId : undefined,
      startsAt: body?.startsAt !== undefined ? (body.startsAt ? new Date(body.startsAt) : null) : undefined,
      endsAt: body?.endsAt !== undefined ? (body.endsAt ? new Date(body.endsAt) : null) : undefined,
      visibilityScope: Object.values(VisibilityScope).includes(body?.visibilityScope)
        ? body.visibilityScope
        : undefined,
    });
    return NextResponse.json({ sprint });
  } catch (err) {
    if (err instanceof SprintServiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
