import { NextRequest, NextResponse } from "next/server";
import { loadUnplannedTasksCatalog } from "@/lib/club-development/sprints/sprint-planning-catalog";
import {
  persistUnplannedTaskOrder,
  UnplannedTaskRankError,
} from "@/lib/club-development/sprints/unplanned-task-rank";
import { hasSprintManagePermission } from "@/lib/club-development/sprints/queries";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";

function flattenUnplannedTaskIds(
  catalog: Awaited<ReturnType<typeof loadUnplannedTasksCatalog>>,
): string[] {
  const ids: string[] = [];
  for (const group of catalog.initiativeGroups) {
    for (const task of group.tasks) ids.push(task.id);
  }
  for (const task of catalog.standaloneGroup.tasks) ids.push(task.id);
  return ids;
}

export async function PUT(req: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  if (!hasSprintManagePermission(access.context.actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const taskCtx = await buildTaskServiceContextForActor(
    access.context.actorUserId,
    access.context.tenantId,
  );
  if (!taskCtx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const orderedTaskIds = Array.isArray(body?.orderedTaskIds)
    ? body.orderedTaskIds.filter((id: unknown): id is string => typeof id === "string")
  : null;
  if (!orderedTaskIds?.length) {
    return NextResponse.json({ error: "orderedTaskIds ist erforderlich." }, { status: 400 });
  }

  const catalog = await loadUnplannedTasksCatalog(access.context.actor, taskCtx, {});
  const allowed = new Set(flattenUnplannedTaskIds(catalog));

  try {
    await persistUnplannedTaskOrder(access.context.tenantId, orderedTaskIds, allowed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnplannedTaskRankError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const prismaCode = (err as { code?: string })?.code;
    if (prismaCode === "P2021" || prismaCode === "42P01") {
      return NextResponse.json(
        {
          error:
            "Die Datenbank-Migration für Ungeplant-Reihenfolge ist noch nicht angewendet (20261120200000_sce_cd_unplanned_task_rank).",
        },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function GET() {
  return NextResponse.json({ error: CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedLoadError }, { status: 405 });
}