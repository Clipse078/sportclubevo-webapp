import type { InitiativeListItem } from "@/lib/initiatives/queries";
import type { MeetingListItem } from "@/lib/meetings/queries";
import type { TargetListItem } from "@/lib/targets/queries";

const ACTIVE_INITIATIVE_STATUSES = new Set([
  "IN_PROGRESS",
  "ON_TRACK",
  "PLANNED",
  "ON_HOLD",
]);

const ACTIVE_TARGET_STATUSES = new Set(["ACTIVE"]);

export function filterRelevantTargets(targets: TargetListItem[]): TargetListItem[] {
  return targets.filter((t) => ACTIVE_TARGET_STATUSES.has(t.status));
}

export function filterActiveInitiatives(
  initiatives: InitiativeListItem[],
): InitiativeListItem[] {
  return initiatives.filter((i) => ACTIVE_INITIATIVE_STATUSES.has(i.status));
}

export function filterUpcomingMeetings(
  meetings: MeetingListItem[],
  now: Date = new Date(),
): MeetingListItem[] {
  return meetings
    .filter((m) => m.status === "PLANNED" && new Date(m.meetingDate) >= now)
    .sort(
      (a, b) =>
        new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime(),
    );
}

export function computeTargetMetricProgress(
  metrics: TargetListItem["metrics"],
): number | null {
  if (metrics.length === 0) return null;
  const first = metrics[0];
  if (!first || first.targetValue === 0) return null;
  if (first.direction === "DECREASE") {
    const start = first.targetValue * 2;
    const ratio = (start - first.currentValue) / start;
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  }
  return Math.max(
    0,
    Math.min(100, Math.round((first.currentValue / first.targetValue) * 100)),
  );
}
