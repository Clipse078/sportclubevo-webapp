import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { SchedulerDraftChange, SchedulerManipulationType, SchedulerTimeTarget } from "@/lib/planning-hub/scheduler-draft";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

/** Canonical resource kinds — not UI labels. */
export type PlanningResourceKind =
  | "PITCH"
  | "DRESSING_ROOM"
  | "HALL"
  | "ROOM"
  | "OTHER_RESOURCE";

export type PlanningResourceMutationType =
  | "MOVE_RESOURCE"
  | "MOVE_TIME"
  | "MOVE_RESOURCE_AND_TIME"
  | "RESIZE_START"
  | "RESIZE_END";

export type PlanningResourceManipulation = {
  activityId: string;
  segmentId?: string;
  sourceFacilityResourceId?: string;
  targetFacilityResourceId?: string;
  originalReservationStart: Date;
  originalReservationEnd: Date;
  proposedReservationStart: Date;
  proposedReservationEnd: Date;
  resourceKind: PlanningResourceKind;
  mutationType: PlanningResourceMutationType;
  /** Activity interval at proposal time — unchanged by resource-only mutations. */
  activityStart: Date;
  activityEnd: Date;
  item: WeekplannerItem;
  versionToken?: string;
};

export function resourceKindForCategory(
  category: PlanningHubUrlState["resourceCategory"],
): PlanningResourceKind {
  return category === "pitch" ? "PITCH" : "DRESSING_ROOM";
}

export function schedulerTimeTargetForCategory(
  category: PlanningHubUrlState["resourceCategory"],
  surface: "kalender" | "resourceTimeline",
): SchedulerTimeTarget {
  if (surface === "kalender") return "activity";
  return "resourceOccupancy";
}

function mapManipulationType(type: SchedulerManipulationType, edge?: "start" | "end"): PlanningResourceMutationType {
  if (type === "combined") return "MOVE_RESOURCE_AND_TIME";
  if (type === "resize") return edge === "start" ? "RESIZE_START" : "RESIZE_END";
  return "MOVE_TIME";
}

export function manipulationFromSchedulerDraft(
  draft: SchedulerDraftChange,
  resourceCategory: PlanningHubUrlState["resourceCategory"],
  resizeEdge?: "start" | "end",
): PlanningResourceManipulation {
  const activityStart = draft.item.startAt;
  const activityEnd = draft.item.endAt;
  const resourceOccupancy = draft.timeTarget === "resourceOccupancy";

  return {
    activityId: draft.itemId,
    segmentId: draft.segmentId,
    sourceFacilityResourceId: draft.originalResourceId,
    targetFacilityResourceId: draft.proposedResourceId ?? draft.originalResourceId,
    originalReservationStart: draft.originalStart,
    originalReservationEnd: draft.originalEnd,
    proposedReservationStart: draft.proposedStart,
    proposedReservationEnd: draft.proposedEnd,
    resourceKind: resourceKindForCategory(resourceCategory),
    mutationType: mapManipulationType(draft.manipulationType, resizeEdge),
    activityStart,
    activityEnd,
    item: draft.item,
  };
}

export function isSyntheticCollapsedResourceId(resourceId: string | null | undefined): boolean {
  return !!resourceId && resourceId.startsWith("__collapsed__");
}

export function activityTimeUnchanged(m: PlanningResourceManipulation): boolean {
  return (
    m.proposedReservationStart.getTime() !== m.activityStart.getTime() ||
    m.proposedReservationEnd.getTime() !== m.activityEnd.getTime() ||
    m.mutationType === "MOVE_RESOURCE" ||
    m.mutationType === "MOVE_RESOURCE_AND_TIME" ||
    m.mutationType === "RESIZE_START" ||
    m.mutationType === "RESIZE_END" ||
    m.mutationType === "MOVE_TIME"
  );
}
