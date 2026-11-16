import { NextRequest, NextResponse } from "next/server";
import { loadUnplannedTasksCatalog } from "@/lib/club-development/sprints/sprint-planning-catalog";
import { hasSprintManagePermission } from "@/lib/club-development/sprints/queries";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";

export async function GET(req: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
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

  const search = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const catalog = await loadUnplannedTasksCatalog(access.context.actor, taskCtx, { search });

  return NextResponse.json({ catalog });
}