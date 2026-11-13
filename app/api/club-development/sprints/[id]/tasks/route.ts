import { NextRequest, NextResponse } from "next/server";
import {
  getDevelopmentSprintById,
  hasSprintManagePermission,
} from "@/lib/club-development/sprints/queries";
import {
  addTaskToSprint,
  listActiveSprintMemberships,
  removeTaskFromSprint,
  SprintServiceError,
} from "@/lib/club-development/sprints/sprint-service";
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
  const memberships = await listActiveSprintMemberships(access.context.tenantId, id);
  return NextResponse.json({ memberships });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  if (!hasSprintManagePermission(access.context.actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const sprint = await getDevelopmentSprintById(id, access.context.actor);
  if (!sprint) {
    return NextResponse.json({ error: "Sprint nicht gefunden." }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const taskId = (body?.taskId ?? "").trim();
    if (!taskId) {
      return NextResponse.json({ error: "taskId ist erforderlich." }, { status: 400 });
    }
    const membership = await addTaskToSprint(access.context.tenantId, id, taskId);
    return NextResponse.json({ membership }, { status: 201 });
  } catch (err) {
    if (err instanceof SprintServiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  if (!hasSprintManagePermission(access.context.actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const sprint = await getDevelopmentSprintById(id, access.context.actor);
  if (!sprint) {
    return NextResponse.json({ error: "Sprint nicht gefunden." }, { status: 404 });
  }

  const taskId =
    req.nextUrl.searchParams.get("taskId")?.trim() ||
    (await req.json().catch(() => ({})))?.taskId?.trim();
  if (!taskId) {
    return NextResponse.json({ error: "taskId ist erforderlich." }, { status: 400 });
  }

  try {
    await removeTaskFromSprint(access.context.tenantId, id, taskId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SprintServiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
