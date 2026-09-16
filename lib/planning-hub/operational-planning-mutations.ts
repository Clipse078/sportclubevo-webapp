import { isCanonicalAllocationGroupState } from "@/lib/weekplanner/plan-allocation-semantics";
import type { WeekplannerActivityType } from "@/lib/weekplanner/plan-types";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import { combineTimeWithReferenceDay, isoToLocalTime } from "@/lib/planning-hub/planner-time";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { WeekplannerOverrideRow } from "@/components/admin/planner/WeekplannerAllocationOverrideEditor";
import { planOverrideKey } from "@/lib/weekplanner/plan-override-key";

async function saveTimeOverride(
  planId: string,
  activityType: WeekplannerActivityType,
  activityId: string,
  startAt: string,
  endAt: string,
  matchesCanonical: boolean,
): Promise<void> {
  if (matchesCanonical) {
    const res = await fetch(`/api/weekplanner/plans/${planId}/time-overrides`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityType, activityId }),
    });
    if (!res.ok && res.status !== 404) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Fehler: HTTP ${res.status}`);
    }
    return;
  }

  const res = await fetch(`/api/weekplanner/plans/${planId}/time-overrides`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityType, activityId, startAt, endAt }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Fehler: HTTP ${res.status}`);
  }
}

async function deleteAllocationOverrides(planId: string, rows: WeekplannerOverrideRow[]): Promise<void> {
  await Promise.all(
    rows.map(async (row) => {
      const res = await fetch(`/api/weekplanner/plans/${planId}/allocations/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Fehler: HTTP ${res.status}`);
      }
    }),
  );
}

async function replaceAllocationOverrides(
  planId: string,
  activityType: WeekplannerActivityType,
  activityId: string,
  allocationGroup: "PITCH_HALL" | "DRESSING_ROOM",
  participantId: string | undefined,
  selectedAllocations: { facilityResourceId: string; occupancyBeforeMinutes?: number; occupancyAfterMinutes?: number }[],
  existingRows: WeekplannerOverrideRow[],
): Promise<void> {
  await deleteAllocationOverrides(planId, existingRows);
  for (const allocation of selectedAllocations) {
    const res = await fetch(`/api/weekplanner/plans/${planId}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityType,
        activityId,
        allocationGroup,
        participantId,
        facilityResourceId: allocation.facilityResourceId,
        occupancyBeforeMinutes: allocation.occupancyBeforeMinutes ?? 0,
        occupancyAfterMinutes: allocation.occupancyAfterMinutes ?? 0,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Fehler: HTTP ${res.status}`);
    }
  }
}

function activityIdForItem(item: WeekplannerItem): string {
  switch (item.type) {
    case "TRAINING":
      return item.trainingSessionId;
    case "MATCH":
    case "TOURNAMENT":
      return item.eventId;
    default:
      return item.id;
  }
}

function activityTypeForItem(item: WeekplannerItem): WeekplannerActivityType {
  if (item.type === "VERANSTALTUNG") {
    throw new Error("Veranstaltungen unterstützen keine direkte Manipulation.");
  }
  return item.type;
}

export async function applyAlternativePlanSchedulerDraft(
  draft: SchedulerDraftChange,
  planId: string,
  resourceCategory: PlanningHubUrlState["resourceCategory"],
  overridesByKey: Record<string, WeekplannerOverrideRow[]>,
  timeZone: string,
): Promise<void> {
  const item = draft.item;
  const activityType = activityTypeForItem(item);
  const activityId = activityIdForItem(item);

  const timeChanged =
    draft.proposedStart.getTime() !== draft.originalStart.getTime() ||
    draft.proposedEnd.getTime() !== draft.originalEnd.getTime();

  if (timeChanged) {
    const nextStartAt = draft.proposedStart.toISOString();
    const nextEndAt = draft.proposedEnd.toISOString();
    const canonicalStart = isoToLocalTime(item.canonicalStartAt, timeZone);
    const canonicalEnd = isoToLocalTime(item.canonicalEndAt, timeZone);
    const proposedStart = isoToLocalTime(draft.proposedStart, timeZone);
    const proposedEnd = isoToLocalTime(draft.proposedEnd, timeZone);
    const matchesCanonical = proposedStart === canonicalStart && proposedEnd === canonicalEnd;
    await saveTimeOverride(planId, activityType, activityId, nextStartAt, nextEndAt, matchesCanonical);
  }

  const resourceChanged =
    draft.proposedResourceId &&
    draft.originalResourceId &&
    draft.proposedResourceId !== draft.originalResourceId;

  if (!resourceChanged || !draft.proposedResourceId || !draft.originalResourceId) return;

  const allocationGroup = resourceCategory === "pitch" ? "PITCH_HALL" : "DRESSING_ROOM";
  const overrideRows = overridesByKey[planOverrideKey(activityType, activityId, allocationGroup)] ?? [];

  const currentIds = new Set(
    (allocationGroup === "PITCH_HALL" ? item.pitchAllocations : item.dressingRoomAllocations).map(
      (r) => r.facilityResourceId,
    ),
  );
  const canonicalIds = new Set(
    (allocationGroup === "PITCH_HALL"
      ? item.canonicalPitchAllocations
      : item.canonicalDressingRoomAllocations
    ).map((r) => r.facilityResourceId),
  );

  const nextIds = new Set(currentIds);
  nextIds.delete(draft.originalResourceId);
  nextIds.add(draft.proposedResourceId);

  const selectedAllocations = Array.from(nextIds).map((facilityResourceId) => ({
    facilityResourceId,
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
  }));

  if (
    isCanonicalAllocationGroupState({
      selectedAllocations,
      canonicalResourceIds: Array.from(canonicalIds),
    })
  ) {
    await deleteAllocationOverrides(planId, overrideRows);
  } else {
    await replaceAllocationOverrides(
      planId,
      activityType,
      activityId,
      allocationGroup,
      undefined,
      selectedAllocations,
      overrideRows,
    );
  }
}
