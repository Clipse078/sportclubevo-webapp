import { NextRequest, NextResponse } from "next/server";
import { TaskContextType } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { requireTargetAccess } from "@/lib/visibility/visibility-guards";
import { createTaskWithContextDefaults } from "@/lib/tasks/contextual-task-create";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { TaskValidationError } from "@/lib/tasks/errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.TARGETS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id: targetId } = await params;
  const targetGuard = await requireTargetAccess({
    actor: access.context.actor,
    id: targetId,
    access: "read",
  });
  if (!targetGuard.ok) {
    return NextResponse.json({ error: "Ziel nicht gefunden." }, { status: 404 });
  }

  const taskCtx = await buildTaskServiceContextForActor(
    access.context.actorUserId,
    access.context.tenantId,
  );
  if (!taskCtx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  }

  try {
    const task = await createTaskWithContextDefaults(taskCtx, {
      task: {
        title,
        description: typeof body?.description === "string" ? body.description.trim() : undefined,
      },
      trustedContext: {
        contextType: TaskContextType.TARGET,
        contextId: targetId,
      },
    });
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof TaskValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}