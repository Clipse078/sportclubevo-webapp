import { NextResponse } from "next/server";
import { TaskContextType } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { requireTargetAccess } from "@/lib/visibility/visibility-guards";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { loadContextualTaskCreateView } from "@/lib/tasks/load-contextual-task-create-view";

export async function GET(request: Request) {
  const access = await requireStrategicApiContext([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TARGETS_VIEW]);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const contextTypeRaw = searchParams.get("contextType")?.trim() ?? "";
  const contextId = searchParams.get("contextId")?.trim() ?? "";
  if (contextTypeRaw !== TaskContextType.TARGET || !contextId) {
    return NextResponse.json({ error: "TARGET contextId ist erforderlich." }, { status: 400 });
  }

  const targetGuard = await requireTargetAccess({
    actor: access.context.actor,
    id: contextId,
    access: "read",
  });
  if (!targetGuard.ok) {
    return NextResponse.json({ error: "Ziel nicht gefunden." }, { status: 404 });
  }

  const taskCtx = await buildTaskServiceContextForActor(access.context.actorUserId, access.context.tenantId);
  if (!taskCtx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const view = await loadContextualTaskCreateView(
    taskCtx,
    TaskContextType.TARGET,
    contextId,
    "de-CH",
    taskCtx.timeZone ?? "Europe/Zurich",
  );
  if (!view?.canCreate) {
    return NextResponse.json({ error: "Keine Berechtigung für diese Kontext-Aufgabe." }, { status: 403 });
  }

  return NextResponse.json({ view });
}