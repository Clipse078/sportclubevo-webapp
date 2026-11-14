import { NextRequest, NextResponse } from "next/server";
import { DevelopmentSprintGoalResult } from "@prisma/client";
import {
  getDevelopmentSprintById,
  hasSprintManagePermission,
} from "@/lib/club-development/sprints/queries";
import {
  closeDevelopmentSprint,
  closeDevelopmentSprintLegacy,
} from "@/lib/club-development/sprints/sprint-close-service";
import {
  parseUnfinishedDisposition,
  type UnfinishedTaskDisposition,
} from "@/lib/club-development/sprints/sprint-close-types";
import { SprintServiceError } from "@/lib/club-development/sprints/sprint-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

type RouteContext = { params: Promise<{ id: string }> };

function parseGoalResult(raw: unknown): DevelopmentSprintGoalResult | null {
  if (
    raw === DevelopmentSprintGoalResult.ACHIEVED ||
    raw === DevelopmentSprintGoalResult.PARTLY_ACHIEVED ||
    raw === DevelopmentSprintGoalResult.NOT_ACHIEVED
  ) {
    return raw;
  }
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

  const legacyDisposition = body?.unfinishedDisposition;
  if (legacyDisposition === "KEEP" || legacyDisposition === "REMOVE") {
    try {
      const report = await closeDevelopmentSprintLegacy(
        access.context.tenantId,
        id,
        legacyDisposition,
      );
      return NextResponse.json({ report });
    } catch (err) {
      if (err instanceof SprintServiceError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  const defaultDisposition = parseUnfinishedDisposition(body?.defaultUnfinishedDisposition);
  const goalResult = parseGoalResult(body?.goalResult);
  if (!defaultDisposition) {
    return NextResponse.json(
      {
        error:
          "defaultUnfinishedDisposition muss BACKLOG, FUTURE_SPRINT oder RETAIN_HISTORICAL sein.",
      },
      { status: 400 },
    );
  }
  if (!goalResult) {
    return NextResponse.json(
      { error: "goalResult muss ACHIEVED, PARTLY_ACHIEVED oder NOT_ACHIEVED sein." },
      { status: 400 },
    );
  }

  const taskDestinations = Array.isArray(body?.taskDestinations)
    ? (body.taskDestinations as { taskId?: string; disposition?: string; moveToSprintId?: string }[])
        .map((row) => {
          const disposition = parseUnfinishedDisposition(row.disposition);
          if (!row.taskId || !disposition) return null;
          return {
            taskId: row.taskId,
            disposition,
            moveToSprintId: row.moveToSprintId ?? null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
    : undefined;

  try {
    const report = await closeDevelopmentSprint(
      access.context.tenantId,
      id,
      {
        goalResult,
        reviewNotes: typeof body?.reviewNotes === "string" ? body.reviewNotes : null,
        defaultUnfinishedDisposition: defaultDisposition as UnfinishedTaskDisposition,
        taskDestinations,
      },
      new Date(),
      typeof body?.clientRequestId === "string" ? body.clientRequestId : null,
    );
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof SprintServiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}