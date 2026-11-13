import { NextRequest, NextResponse } from "next/server";
import { getDevelopmentSprintById } from "@/lib/club-development/sprints/queries";
import { loadSprintBoard } from "@/lib/club-development/sprints/sprint-board";
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
  const board = await loadSprintBoard(access.context.tenantId, id);
  return NextResponse.json(board);
}
