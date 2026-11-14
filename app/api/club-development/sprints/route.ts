import { NextRequest, NextResponse } from "next/server";
import { DevelopmentSprintStatus, VisibilityScope } from "@prisma/client";
import { listDevelopmentSprints, hasSprintManagePermission } from "@/lib/club-development/sprints/queries";
import { createDevelopmentSprint, SprintServiceError } from "@/lib/club-development/sprints/sprint-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

export async function GET() {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const sprints = await listDevelopmentSprints(access.context.actor);
  return NextResponse.json({ sprints });
}

export async function POST(req: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  if (!hasSprintManagePermission(access.context.actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const status = Object.values(DevelopmentSprintStatus).includes(body?.status)
      ? body.status
      : undefined;
    const visibilityScope = Object.values(VisibilityScope).includes(body?.visibilityScope)
      ? body.visibilityScope
      : undefined;

    const created = await createDevelopmentSprint(access.context.tenantId, access.context.actorUserId, {
      title: body?.title ?? "",
      slug: body?.slug,
      goal: body?.goal,
      status,
      owner: body?.owner,
      ownerPersonId: body?.ownerPersonId,
      startsAt: body?.startsAt ? new Date(body.startsAt) : null,
      endsAt: body?.endsAt ? new Date(body.endsAt) : null,
      visibilityScope,
    });
    return NextResponse.json({ sprint: created }, { status: 201 });
  } catch (err) {
    if (err instanceof SprintServiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
