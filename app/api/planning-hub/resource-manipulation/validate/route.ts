import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import {
  PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS,
  PLANNING_ALLOCATIONS_VIEW_PERMISSIONS,
} from "@/lib/permissions/planning-allocation-permissions";
import { evaluateManipulationConflicts } from "@/lib/planning-hub/manipulation-projection";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";

type ValidateBody = {
  draft: Omit<
    SchedulerDraftChange,
    "originalStart" | "originalEnd" | "proposedStart" | "proposedEnd" | "item"
  > & {
    originalStart: string;
    originalEnd: string;
    proposedStart: string;
    proposedEnd: string;
    item: WeekplannerItem;
  };
  allItems: WeekplannerItem[];
  resourceCategory: PlanningHubUrlState["resourceCategory"];
  targetResource?: WeekplannerResourceRef | null;
};

export async function POST(req: NextRequest) {
  const auth = await requireApiAnyPermission([
    ...PLANNING_ALLOCATIONS_VIEW_PERMISSIONS,
    ...PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS,
  ]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as ValidateBody | null;
  if (!body?.draft?.item) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const draft: SchedulerDraftChange = {
    ...body.draft,
    originalStart: new Date(body.draft.originalStart),
    originalEnd: new Date(body.draft.originalEnd),
    proposedStart: new Date(body.draft.proposedStart),
    proposedEnd: new Date(body.draft.proposedEnd),
  };

  const preview = evaluateManipulationConflicts(
    body.allItems,
    draft,
    body.targetResource ?? null,
    body.resourceCategory,
  );

  return NextResponse.json({ preview });
}
