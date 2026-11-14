import { NextRequest, NextResponse } from "next/server";
import { getDevelopmentSprintById } from "@/lib/club-development/sprints/queries";
import { buildSprintReviewViewModel } from "@/lib/club-development/sprints/sprint-review";
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

  const review = buildSprintReviewViewModel({
    goal: sprint.goal,
    goalResult: sprint.goalResult,
    reviewNotes: sprint.reviewNotes,
    startedAt: sprint.startedAt,
    completedAt: sprint.completedAt,
    closeSnapshot: sprint.closeSnapshot,
  });

  return NextResponse.json({ review, sprintStatus: sprint.status });
}