import { NextRequest, NextResponse } from "next/server";
import { searchClubDevelopmentTaskCandidates } from "@/lib/club-development/club-development-task-candidates";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";

export async function GET(req: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const taskCtx = await buildTaskServiceContextForActor(
    access.context.actorUserId,
    access.context.tenantId,
  );
  if (!taskCtx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
  const excludeParam = req.nextUrl.searchParams.get("exclude") ?? "";
  const excludeTaskIds = excludeParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const tasks = await searchClubDevelopmentTaskCandidates(taskCtx, {
    query: q,
    limit,
    excludeTaskIds,
  });

  return NextResponse.json({ tasks });
}