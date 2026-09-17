import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";

/** Stable key for snapped draft geometry — avoids redundant conflict preview work. */
export function draftGeometryKey(draft: Pick<
  SchedulerDraftChange,
  "proposedStart" | "proposedEnd" | "proposedResourceId" | "originalResourceId"
>): string {
  return [
    draft.proposedStart.getTime(),
    draft.proposedEnd.getTime(),
    draft.proposedResourceId ?? "",
    draft.originalResourceId ?? "",
  ].join(":");
}
