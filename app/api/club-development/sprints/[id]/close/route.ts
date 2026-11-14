import { NextRequest, NextResponse } from "next/server";
import {
  getDevelopmentSprintById,
  hasSprintManagePermission,
} from "@/lib/club-development/sprints/queries";
import {
  closeDevelopmentSprint,
  type UnfinishedDisposition,
} from "@/lib/club-development/sprints/sprint-close-service";
import { SprintServiceError } from "@/lib/club-development/sprints/sprint-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

type RouteContext = { params: Promise<{ id: string }> };

function parseDisposition(raw: unknown): UnfinishedDisposition | null {
  if (raw === "KEEP" || raw === "REMOVE") return raw;
  return null;
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

  const body = await req.json().catch(() => ({}));
  const unfinishedDisposition = parseDisposition(body?.unfinishedDisposition);
  if (!unfinishedDisposition) {
    return NextResponse.json(
      { error: "unfinishedDisposition muss KEEP oder REMOVE sein." },
      { status: 400 },
    );
  }

  try {
    const report = await closeDevelopmentSprint(
      access.context.tenantId,
      id,
      unfinishedDisposition,
    );
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof SprintServiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
