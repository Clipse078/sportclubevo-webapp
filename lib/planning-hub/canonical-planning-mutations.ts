import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import type { FacilityResourceType } from "@prisma/client";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import { isoToLocalDate, isoToLocalTime } from "@/lib/planning-hub/planner-time";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";

function resolveResourceCode(facilityGroups: FacilityGroup[], resourceId: string): string | null {
  for (const fg of facilityGroups) {
    const r = fg.resources.find((res) => res.id === resourceId);
    if (r) return r.code;
  }
  return null;
}

function timeChanged(draft: SchedulerDraftChange): boolean {
  return (
    draft.proposedStart.getTime() !== draft.originalStart.getTime() ||
    draft.proposedEnd.getTime() !== draft.originalEnd.getTime()
  );
}

function resourceChanged(draft: SchedulerDraftChange): boolean {
  return (
    !!draft.proposedResourceId &&
    !!draft.originalResourceId &&
    draft.proposedResourceId !== draft.originalResourceId
  );
}

async function applyTrainingTime(sessionId: string, startAt: Date, endAt: Date, timeZone: string) {
  const res = await fetch(`/api/training-sessions/${sessionId}/reschedule`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: isoToLocalDate(startAt, timeZone),
      startsAt: isoToLocalTime(startAt, timeZone),
      endsAt: isoToLocalTime(endAt, timeZone),
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Zeitänderung fehlgeschlagen.");
  }
}

async function syncTrainingAllocationGroup(
  sessionId: string,
  group: "PITCH_HALL" | "DRESSING_ROOM",
  selectedIds: Set<string>,
) {
  const currentAllocationsRes = await fetch(`/api/training-sessions/${sessionId}/allocations`);
  const currentData = (await currentAllocationsRes.json().catch(() => null)) as
    | { allocations?: Array<{ id: string; facilityResourceType: string }> }
    | null;
  const currentAllocations = currentData?.allocations ?? [];

  const inGroup = currentAllocations.filter(
    (a) => classifyFacilityResourceType(a.facilityResourceType as FacilityResourceType) === group,
  );

  await Promise.all(
    inGroup.map((a) =>
      fetch(`/api/training-sessions/${sessionId}/allocations/${a.id}`, { method: "DELETE" }),
    ),
  );

  for (const resourceId of selectedIds) {
    const res = await fetch(`/api/training-sessions/${sessionId}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facilityResourceId: resourceId }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Ressourcenzuweisung fehlgeschlagen.");
    }
  }
}

async function applyTrainingResourceSwap(
  item: Extract<WeekplannerItem, { type: "TRAINING" }>,
  fromId: string,
  toId: string,
  category: PlanningHubUrlState["resourceCategory"],
) {
  const pitchIds = new Set(item.canonicalPitchAllocations.map((r) => r.facilityResourceId));
  const roomIds = new Set(item.canonicalDressingRoomAllocations.map((r) => r.facilityResourceId));

  if (category === "pitch") {
    const next = new Set(pitchIds);
    next.delete(fromId);
    next.add(toId);
    await syncTrainingAllocationGroup(item.trainingSessionId, "PITCH_HALL", next);
    return;
  }

  const next = new Set(roomIds);
  next.delete(fromId);
  next.add(toId);
  await syncTrainingAllocationGroup(item.trainingSessionId, "DRESSING_ROOM", next);
}

async function applyMatchResourceSwap(
  item: Extract<WeekplannerItem, { type: "MATCH" }>,
  fromId: string,
  toId: string,
  category: PlanningHubUrlState["resourceCategory"],
  facilityGroups: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] },
) {
  const body: Record<string, string | null> = {};
  const toCode = resolveResourceCode(
    category === "pitch" ? facilityGroups.PITCH_HALL : facilityGroups.DRESSING_ROOM,
    toId,
  );
  if (!toCode) throw new Error("Ressource nicht gefunden.");

  if (category === "pitch") {
    body.pitchCode = toCode;
  } else if (item.awayDressingRoomAllocations.some((r) => r.facilityResourceId === fromId)) {
    body.awayDressingRoomCode = toCode;
  } else {
    body.homeDressingRoomCode = toCode;
  }

  const res = await fetch(`/api/matchcenter/${item.eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
  }
}

async function applyTournamentPitchSwap(
  item: Extract<WeekplannerItem, { type: "TOURNAMENT" }>,
  fromId: string,
  toId: string,
) {
  const initPitchIds = new Set(item.canonicalPitchAllocations.map((r) => r.facilityResourceId));
  const selectedPitchIds = new Set(initPitchIds);
  selectedPitchIds.delete(fromId);
  selectedPitchIds.add(toId);

  const toRemove = Array.from(initPitchIds).filter((id) => !selectedPitchIds.has(id));
  const toAdd = Array.from(selectedPitchIds).filter((id) => !initPitchIds.has(id));

  const allocsRes = await fetch(`/api/tournaments/${item.eventId}/resource-allocations`);
  const allocsData = (await allocsRes.json().catch(() => null)) as
    | { allocations?: Array<{ id: string; facilityResourceId: string }> }
    | null;
  const existingAllocs = allocsData?.allocations ?? [];

  await Promise.all(
    toRemove
      .map((resourceId) => existingAllocs.find((a) => a.facilityResourceId === resourceId))
      .filter(Boolean)
      .map((a) =>
        fetch(`/api/tournaments/${item.eventId}/resource-allocations/${a!.id}`, { method: "DELETE" }),
      ),
  );

  await Promise.all(
    toAdd.map((resourceId) =>
      fetch(`/api/tournaments/${item.eventId}/resource-allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityResourceId: resourceId }),
      }),
    ),
  );
}

export async function applyStandardPlanSchedulerDraft(
  draft: SchedulerDraftChange,
  resourceCategory: PlanningHubUrlState["resourceCategory"],
  facilityGroups: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] },
  timeZone: string,
): Promise<void> {
  const item = draft.item;

  if (item.type === "TRAINING") {
    if (timeChanged(draft)) {
      await applyTrainingTime(item.trainingSessionId, draft.proposedStart, draft.proposedEnd, timeZone);
    }
    if (resourceChanged(draft) && draft.originalResourceId && draft.proposedResourceId) {
      await applyTrainingResourceSwap(item, draft.originalResourceId, draft.proposedResourceId, resourceCategory);
    }
    return;
  }

  if (item.type === "MATCH") {
    if (timeChanged(draft)) {
      throw new Error("Zeitänderung für Heimspiele ist im Standardplan nicht verfügbar.");
    }
    if (resourceChanged(draft) && draft.originalResourceId && draft.proposedResourceId) {
      await applyMatchResourceSwap(
        item,
        draft.originalResourceId,
        draft.proposedResourceId,
        resourceCategory,
        facilityGroups,
      );
    }
    return;
  }

  if (item.type === "TOURNAMENT") {
    if (timeChanged(draft)) {
      throw new Error("Zeitänderung für Turniere ist im Standardplan nicht verfügbar.");
    }
    if (resourceChanged(draft) && draft.originalResourceId && draft.proposedResourceId) {
      await applyTournamentPitchSwap(item, draft.originalResourceId, draft.proposedResourceId);
    }
  }
}
