import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PLANNING_ALLOCATIONS_VIEW_PERMISSIONS } from "@/lib/permissions/planning-allocation-permissions";
import { evaluateManipulationConflicts } from "@/lib/planning-hub/manipulation-projection";
import {
  assertActivityReschedulePermitted,
  ActivityRescheduleForbiddenError,
} from "@/lib/planning-hub/activity-rescheduling-mutations";
import {
  assertActivityTimeMutationPermitted,
  assertManipulationTenantScope,
  ManipulationForbiddenError,
} from "@/lib/planning-hub/manipulation-server-authorization";
import { resolveLiveManipulationActorPermissions } from "@/lib/planning-hub/manipulation-live-permissions";
import {
  buildActivityRescheduleProposal,
  isActivityTimeDraft,
} from "@/lib/planning-hub/planning-activity-rescheduling";
import {
  ManipulationTransportValidationError,
  parseSchedulerDraftFromTransport,
  reviveWeekplannerItemsFromTransport,
} from "@/lib/planning-hub/manipulation-transport";
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
  isStandardplan: boolean;
  alternativePlanId: string | null;
};

export async function POST(req: NextRequest) {
  const auth = await requireApiAnyPermission([...PLANNING_ALLOCATIONS_VIEW_PERMISSIONS]);
  if (!auth.ok) {
    return NextResponse.json(
      {
        error:
          auth.status === 403
            ? "Du hast keine Berechtigung mehr, diese Planung zu ändern."
            : auth.error,
      },
      { status: auth.status },
    );
  }

  const body = (await req.json().catch(() => null)) as ValidateBody | null;
  if (!body?.draft?.item) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  let draft: SchedulerDraftChange;
  let allItems: WeekplannerItem[];
  try {
    draft = parseSchedulerDraftFromTransport(body.draft);
    allItems = reviveWeekplannerItemsFromTransport(body.allItems ?? []);
  } catch (err) {
    if (err instanceof ManipulationTransportValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  if (!isActivityTimeDraft(draft)) {
    return NextResponse.json(
      { error: "Nur Sporttermin-Manipulationen werden unterstützt." },
      { status: 400 },
    );
  }

  const tenantId = auth.session.user.activeTenantId ?? null;
  const userId = auth.session.user.effectiveUserId ?? auth.session.user.id;

  try {
    assertManipulationTenantScope(body.draft.item, tenantId);
    if (userId && tenantId) {
      const actor = await resolveLiveManipulationActorPermissions(userId, tenantId);
      assertActivityTimeMutationPermitted(body.draft.item, actor);
    }
    assertActivityReschedulePermitted(
      draft,
      body.isStandardplan,
      body.alternativePlanId,
    );
  } catch (err) {
    if (
      err instanceof ActivityRescheduleForbiddenError ||
      err instanceof ManipulationForbiddenError
    ) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const conflictPreview = evaluateManipulationConflicts(
    allItems,
    draft,
    body.targetResource ?? null,
    body.resourceCategory,
  );

  const proposal = buildActivityRescheduleProposal(draft, {
    isStandardplan: body.isStandardplan,
    alternativePlanId: body.alternativePlanId,
  });

  return NextResponse.json({ conflictPreview, proposal });
}
