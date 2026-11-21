import { NextRequest, NextResponse } from "next/server";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { hasSprintManagePermission, listDevelopmentSprints } from "@/lib/club-development/sprints/queries";
import {
  persistPlannedSprintOrder,
  PlannedSprintRankError,
} from "@/lib/club-development/sprints/planned-sprint-rank";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

export async function PUT(req: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  if (!hasSprintManagePermission(access.context.actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const orderedSprintIds = Array.isArray(body?.orderedSprintIds)
    ? body.orderedSprintIds.filter((id: unknown): id is string => typeof id === "string")
    : null;
  if (!orderedSprintIds?.length) {
    return NextResponse.json({ error: "orderedSprintIds ist erforderlich." }, { status: 400 });
  }

  const sprints = await listDevelopmentSprints(access.context.actor);
  const allowed = new Set(sprints.filter((s) => s.status === "PLANNED").map((s) => s.id));

  try {
    await persistPlannedSprintOrder(access.context.tenantId, orderedSprintIds, allowed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PlannedSprintRankError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const prismaCode = (err as { code?: string })?.code;
    if (prismaCode === "P2021" || prismaCode === "42P01") {
      return NextResponse.json(
        {
          error:
            "Die Datenbank-Migration für geplante Phasen-Reihenfolge ist noch nicht angewendet (20261121180000_sce_cd_planned_sprint_rank).",
        },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function GET() {
  return NextResponse.json({ error: CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.plannedReorderFailed }, { status: 405 });
}