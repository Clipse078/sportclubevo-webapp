import { detectWeekplannerConflicts } from "@/lib/weekplanner/view-model";
import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { SchedulerDraftChange } from "./scheduler-draft";

export type ManipulationConflictPreview = {
  status: "valid" | "warning" | "invalid";
  newResourceConflictCount: number;
  message: string;
};

function replaceResourceRef(
  refs: WeekplannerResourceRef[],
  fromId: string,
  toRef: WeekplannerResourceRef,
): WeekplannerResourceRef[] {
  return refs.map((r) => (r.facilityResourceId === fromId ? toRef : r));
}

function applyResourceSwap(
  item: WeekplannerItem,
  fromResourceId: string,
  toRef: WeekplannerResourceRef,
  category: PlanningHubUrlState["resourceCategory"],
): WeekplannerItem {
  if (category === "pitch") {
    return {
      ...item,
      pitchAllocations: replaceResourceRef(item.pitchAllocations, fromResourceId, toRef),
    };
  }

  if (item.type === "MATCH") {
    const inHome = item.dressingRoomAllocations.some((r) => r.facilityResourceId === fromResourceId);
    const inAway = item.awayDressingRoomAllocations.some((r) => r.facilityResourceId === fromResourceId);
    if (inAway) {
      return {
        ...item,
        awayDressingRoomAllocations: replaceResourceRef(
          item.awayDressingRoomAllocations,
          fromResourceId,
          toRef,
        ),
      };
    }
    if (inHome) {
      return {
        ...item,
        dressingRoomAllocations: replaceResourceRef(item.dressingRoomAllocations, fromResourceId, toRef),
      };
    }
  }

  return {
    ...item,
    dressingRoomAllocations: replaceResourceRef(item.dressingRoomAllocations, fromResourceId, toRef),
  };
}

export function projectItemWithDraft(
  item: WeekplannerItem,
  draft: Pick<
    SchedulerDraftChange,
    "proposedStart" | "proposedEnd" | "originalResourceId" | "proposedResourceId"
  >,
  targetResourceRef: WeekplannerResourceRef | null,
  resourceCategory: PlanningHubUrlState["resourceCategory"],
): WeekplannerItem {
  let projected: WeekplannerItem = {
    ...item,
    startAt: draft.proposedStart,
    endAt: draft.proposedEnd,
  };

  if (
    draft.originalResourceId &&
    draft.proposedResourceId &&
    draft.proposedResourceId !== draft.originalResourceId &&
    targetResourceRef
  ) {
    projected = applyResourceSwap(projected, draft.originalResourceId, targetResourceRef, resourceCategory);
  }

  return projected;
}

export function evaluateManipulationConflicts(
  allItems: readonly WeekplannerItem[],
  draft: SchedulerDraftChange,
  targetResourceRef: WeekplannerResourceRef | null,
  resourceCategory: PlanningHubUrlState["resourceCategory"],
): ManipulationConflictPreview {
  const projected = projectItemWithDraft(draft.item, draft, targetResourceRef, resourceCategory);
  const others = allItems.filter((i) => i.id !== draft.itemId);
  const annotated = detectWeekplannerConflicts([...others, projected]);
  const flagged = annotated.find((i) => i.id === draft.itemId);
  const newCount = flagged?.conflicts.length ?? 0;
  const originalCount = draft.item.conflicts.length;

  const additional = Math.max(0, newCount - originalCount);

  if (additional === 0) {
    return {
      status: "valid",
      newResourceConflictCount: 0,
      message: "Keine neuen Ressourcenkonflikte",
    };
  }

  return {
    status: "warning",
    newResourceConflictCount: additional,
    message:
      additional === 1
        ? "1 neuer Ressourcenkonflikt"
        : `${additional} neue Ressourcenkonflikte`,
  };
}
