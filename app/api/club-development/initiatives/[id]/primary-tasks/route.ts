import { NextRequest, NextResponse } from "next/server";
import {
  clearTaskPrimaryInitiative,
  listPrimaryInitiativeTasks,
  setTaskPrimaryInitiative,
  TaskPrimaryInitiativeError,
} from "@/lib/club-development/task-primary-initiative-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { TaskForbiddenError, TaskNotFoundError } from "@/lib/tasks/errors";
import { getInitiativeById } from "@/lib/initiatives/queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const initiative = await getInitiativeById(id, access.context.actor);
  if (!initiative) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }

  const taskCtx = await buildTaskServiceContextForActor(
    access.context.actorUserId,
    access.context.tenantId,
  );
  if (!taskCtx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await listPrimaryInitiativeTasks(access.context.tenantId, initiative.id, taskCtx);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const initiative = await getInitiativeById(id, access.context.actor);
  if (!initiative) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }

  const taskCtx = await buildTaskServiceContextForActor(
    access.context.actorUserId,
    access.context.tenantId,
  );
  if (!taskCtx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const taskId = (body?.taskId ?? "").trim();
    if (!taskId) {
      return NextResponse.json({ error: "taskId ist erforderlich." }, { status: 400 });
    }
    const updated = await setTaskPrimaryInitiative(
      access.context.tenantId,
      initiative.id,
      taskId,
      taskCtx,
    );
    return NextResponse.json({ task: updated }, { status: 201 });
  } catch (err) {
    if (err instanceof TaskPrimaryInitiativeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof TaskForbiddenError || err instanceof TaskNotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const { id } = await params;
  const initiative = await getInitiativeById(id, access.context.actor);
  if (!initiative) {
    return NextResponse.json({ error: "Vorhaben nicht gefunden." }, { status: 404 });
  }

  const taskCtx = await buildTaskServiceContextForActor(
    access.context.actorUserId,
    access.context.tenantId,
  );
  if (!taskCtx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const taskId =
    req.nextUrl.searchParams.get("taskId")?.trim() ||
    (await req.json().catch(() => ({})))?.taskId?.trim();
  if (!taskId) {
    return NextResponse.json({ error: "taskId ist erforderlich." }, { status: 400 });
  }

  try {
    const updated = await clearTaskPrimaryInitiative(
      access.context.tenantId,
      initiative.id,
      taskId,
      taskCtx,
    );
    return NextResponse.json({ task: updated });
  } catch (err) {
    if (err instanceof TaskPrimaryInitiativeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof TaskForbiddenError || err instanceof TaskNotFoundError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}