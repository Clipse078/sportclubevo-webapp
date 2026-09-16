import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type SchedulerManipulationType = "move" | "resize" | "combined";

export type SchedulerDraftChange = {
  itemId: string;
  segmentId?: string;
  originalStart: Date;
  originalEnd: Date;
  proposedStart: Date;
  proposedEnd: Date;
  originalResourceId?: string;
  proposedResourceId?: string;
  manipulationType: SchedulerManipulationType;
  item: WeekplannerItem;
};

export function draftHasGeometryChange(draft: SchedulerDraftChange): boolean {
  const timeChanged =
    draft.proposedStart.getTime() !== draft.originalStart.getTime() ||
    draft.proposedEnd.getTime() !== draft.originalEnd.getTime();
  const resourceChanged =
    draft.proposedResourceId !== undefined &&
    draft.originalResourceId !== undefined &&
    draft.proposedResourceId !== draft.originalResourceId;
  return timeChanged || resourceChanged;
}

export function isNoOpDraft(draft: SchedulerDraftChange): boolean {
  return !draftHasGeometryChange(draft);
}
