import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import {
  deleteTaskPermanently,
  getTaskDeletionImpact,
} from "@/lib/tasks/task-delete-service";
import {
  ParentHasSubtasksForDeleteError,
  TaskForbiddenError,
  TaskNotFoundError,
} from "@/lib/tasks/errors";
import { sanitizeInternalAppReturnPath } from "@/lib/navigation/safe-internal-app-return-path";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await getTaskServiceContext();
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorUserId = session.user.effectiveUserId ?? session.user.id ?? "";
  const resolver = createEffectivePermissionResolver(prisma);
  const authorized = await resolver.hasTenantDeletionAuthority({
    userId: actorUserId,
    permission: PERMISSIONS.TASKS_DELETE,
    tenantId: ctx.tenantId,
  });

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await params;
  const confirmed = request.nextUrl.searchParams.get("confirm") === "true";

  if (!confirmed) {
    try {
      const impact = await getTaskDeletionImpact(ctx, taskId);
      if (!impact) {
        return NextResponse.json({ error: "Aufgabe nicht gefunden." }, { status: 404 });
      }
      if (impact.subtaskCount > 0) {
        return NextResponse.json(
          {
            error: "Übergeordnete Aufgabe kann nicht gelöscht werden, solange Unteraufgaben bestehen.",
            code: "PARENT_HAS_SUBTASKS",
            impact,
          },
          { status: 400 },
        );
      }
      return NextResponse.json({ impact, requiresConfirmation: true });
    } catch (error) {
      if (error instanceof TaskNotFoundError || error instanceof TaskForbiddenError) {
        return NextResponse.json({ error: "Aufgabe nicht gefunden." }, { status: 404 });
      }
      throw error;
    }
  }

  try {
    const result = await deleteTaskPermanently(ctx, taskId);
    if (!result) {
      return NextResponse.json({ error: "Aufgabe nicht gefunden." }, { status: 404 });
    }

    const returnTo = sanitizeInternalAppReturnPath(
      request.nextUrl.searchParams.get("returnTo"),
    );
    const redirectTo = returnTo ?? "/dashboard/aufgaben";

    return NextResponse.json({
      ok: true,
      taskId: result.taskId,
      title: result.title,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof ParentHasSubtasksForDeleteError) {
      return NextResponse.json({ error: error.message, code: "PARENT_HAS_SUBTASKS" }, { status: 400 });
    }
    if (error instanceof TaskNotFoundError || error instanceof TaskForbiddenError) {
      return NextResponse.json({ error: "Aufgabe nicht gefunden." }, { status: 404 });
    }
    throw error;
  }
}