import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import type { FacilityResourceType } from "@prisma/client";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import { isoToLocalDate, isoToLocalTime } from "@/lib/planning-hub/planner-time";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { buffersFromOccupancyInterval } from "@/lib/planning-hub/scheduler/resource-occupancy-manipulation";

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

function isResourceOccupancyDraft(draft: SchedulerDraftChange): boolean {
  return draft.timeTarget === "resourceOccupancy";
}

function occupancyIntervalChanged(draft: SchedulerDraftChange): boolean {
  return isResourceOccupancyDraft(draft) && timeChanged(draft);
}

async function applyTrainingDressingOccupancy(
  sessionId: string,
  beforeMinutes: number,
  afterMinutes: number,
) {
  const res = await fetch(`/api/training-sessions/${sessionId}/dressing-room-occupancy`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "CUSTOM",
      beforeMinutes,
      afterMinutes,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Belegungszeit konnte nicht gespeichert werden.");
  }
}

async function applyMatchPatch(eventId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/matchcenter/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
  }
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
): Promise<number> {
  const currentAllocationsRes = await fetch(`/api/training-sessions/${sessionId}/allocations`);
  if (!currentAllocationsRes.ok) {
    const data = (await currentAllocationsRes.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Aktuelle Ressourcenzuweisungen konnten nicht geladen werden.");
  }
  const currentData = (await currentAllocationsRes.json().catch(() => null)) as
    | { allocations?: Array<{ id: string; facilityResourceType: string }> }
    | null;
  const currentAllocations = currentData?.allocations ?? [];

  const inGroup = currentAllocations.filter(
    (a) => classifyFacilityResourceType(a.facilityResourceType as FacilityResourceType) === group,
  );

  let mutations = 0;
  for (const allocation of inGroup) {
    const deleteRes = await fetch(`/api/training-sessions/${sessionId}/allocations/${allocation.id}`, {
      method: "DELETE",
    });
    if (!deleteRes.ok) {
      const data = (await deleteRes.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Ressourcenzuweisung konnte nicht entfernt werden.");
    }
    mutations += 1;
  }

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
    mutations += 1;
  }
  return mutations;
}

async function applyTrainingOccurrenceResourceReassign(
  sessionId: string,
  targetResourceId: string,
  category: PlanningHubUrlState["resourceCategory"],
): Promise<void> {
  const res = await fetch("/api/training/planning-grid/reassign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      targetResourceId,
      category: category === "pitch" ? "PITCH_HALL" : "DRESSING_ROOM",
      scope: "occurrence",
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Ressourcenzuweisung fehlgeschlagen.");
  }
}

async function applyTrainingResourceSwap(
  item: Extract<WeekplannerItem, { type: "TRAINING" }>,
  fromId: string,
  toId: string,
  category: PlanningHubUrlState["resourceCategory"],
): Promise<void> {
  const pitchIds = new Set(item.canonicalPitchAllocations.map((r) => r.facilityResourceId));
  const roomIds = new Set(item.canonicalDressingRoomAllocations.map((r) => r.facilityResourceId));

  if (category === "pitch") {
    const next = new Set(pitchIds);
    next.delete(fromId);
    next.add(toId);
    if (next.size === 1 && next.has(toId) && !next.has(fromId)) {
      await applyTrainingOccurrenceResourceReassign(item.trainingSessionId, toId, category);
      return;
    }
    const mutations = await syncTrainingAllocationGroup(item.trainingSessionId, "PITCH_HALL", next);
    if (mutations === 0) {
      throw new Error("Ressourcenzuweisung konnte nicht gespeichert werden.");
    }
    return;
  }

  const next = new Set(roomIds);
  next.delete(fromId);
  next.add(toId);
  const mutations = await syncTrainingAllocationGroup(item.trainingSessionId, "DRESSING_ROOM", next);
  if (mutations === 0) {
    throw new Error("Ressourcenzuweisung konnte nicht gespeichert werden.");
  }
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

export type StandardPlanSchedulerApplyResult = {
  applied: boolean;
  mutationKinds: Array<"activity_time" | "resource_occupancy" | "resource_swap">;
};

export async function applyStandardPlanSchedulerDraft(
  draft: SchedulerDraftChange,
  resourceCategory: PlanningHubUrlState["resourceCategory"],
  facilityGroups: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] },
  timeZone: string,
): Promise<StandardPlanSchedulerApplyResult> {
  const item = draft.item;
  const mutationKinds: StandardPlanSchedulerApplyResult["mutationKinds"] = [];

  if (item.type === "TRAINING") {
    if (timeChanged(draft) && !isResourceOccupancyDraft(draft)) {
      await applyTrainingTime(item.trainingSessionId, draft.proposedStart, draft.proposedEnd, timeZone);
      mutationKinds.push("activity_time");
    }
    if (occupancyIntervalChanged(draft)) {
      if (resourceCategory === "dressing") {
        const { beforeMinutes, afterMinutes } = buffersFromOccupancyInterval(
          item.startAt,
          item.endAt,
          draft.proposedStart,
          draft.proposedEnd,
        );
        await applyTrainingDressingOccupancy(item.trainingSessionId, beforeMinutes, afterMinutes);
        mutationKinds.push("resource_occupancy");
      } else {
        throw new Error(
          "Reservierungszeit am Spielfeld im Standardplan über einen Alternativplan speichern.",
        );
      }
    }
    if (resourceChanged(draft) && draft.originalResourceId && draft.proposedResourceId) {
      await applyTrainingResourceSwap(item, draft.originalResourceId, draft.proposedResourceId, resourceCategory);
      mutationKinds.push("resource_swap");
    }
    if (
      (timeChanged(draft) && !isResourceOccupancyDraft(draft)) ||
      occupancyIntervalChanged(draft) ||
      resourceChanged(draft)
    ) {
      if (mutationKinds.length === 0) {
        throw new Error("Planungsänderung konnte nicht gespeichert werden.");
      }
    }
    return { applied: mutationKinds.length > 0, mutationKinds };
  }

  if (item.type === "MATCH") {
    const matchMutationKinds: StandardPlanSchedulerApplyResult["mutationKinds"] = [];
    if (timeChanged(draft) && !isResourceOccupancyDraft(draft)) {
      const { resolveActivityScheduleAuthority } = await import(
        "@/lib/planning-hub/planning-activity-rescheduling"
      );
      const validation = resolveActivityScheduleAuthority(item, {
        isStandardplan: true,
        alternativePlanId: null,
      });
      if (!validation.permitted) {
        throw new Error(
          validation.reason ?? "Zeitänderung für dieses Spiel ist nicht verfügbar.",
        );
      }
      await applyMatchPatch(item.eventId, {
        startAt: draft.proposedStart.toISOString(),
        endAt: draft.proposedEnd.toISOString(),
      });
      matchMutationKinds.push("activity_time");
    }

    const matchBody: Record<string, unknown> = {};
    if (resourceChanged(draft) && draft.originalResourceId && draft.proposedResourceId) {
      const toCode = resolveResourceCode(
        resourceCategory === "pitch" ? facilityGroups.PITCH_HALL : facilityGroups.DRESSING_ROOM,
        draft.proposedResourceId,
      );
      if (!toCode) throw new Error("Ressource nicht gefunden.");
      if (resourceCategory === "pitch") {
        matchBody.pitchCode = toCode;
      } else if (item.awayDressingRoomAllocations.some((r) => r.facilityResourceId === draft.originalResourceId)) {
        matchBody.awayDressingRoomCode = toCode;
      } else {
        matchBody.homeDressingRoomCode = toCode;
      }
    }
    if (occupancyIntervalChanged(draft)) {
      if (resourceCategory === "dressing") {
        const { beforeMinutes, afterMinutes } = buffersFromOccupancyInterval(
          item.startAt,
          item.endAt,
          draft.proposedStart,
          draft.proposedEnd,
        );
        matchBody.dressingRoomOccupancyMode = "CUSTOM";
        matchBody.dressingRoomBeforeMinutes = beforeMinutes;
        matchBody.dressingRoomAfterMinutes = afterMinutes;
      } else {
        const { saveMatchOperationalEndOverride } = await import(
          "@/lib/weekplanner/weekplanner-match-schedule"
        );
        if (draft.proposedEnd.getTime() !== draft.originalEnd.getTime()) {
          await saveMatchOperationalEndOverride(item.eventId, draft.proposedEnd.toISOString());
        }
        if (draft.proposedStart.getTime() !== draft.originalStart.getTime()) {
          throw new Error(
            "Reservierungsbeginn am Spielfeld im Standardplan über einen Alternativplan speichern.",
          );
        }
      }
    }
    if (Object.keys(matchBody).length > 0) {
      await applyMatchPatch(item.eventId, matchBody);
      matchMutationKinds.push(resourceChanged(draft) ? "resource_swap" : "resource_occupancy");
    }
    return { applied: matchMutationKinds.length > 0, mutationKinds: matchMutationKinds };
  }

  if (item.type === "TOURNAMENT") {
    const tournamentMutationKinds: StandardPlanSchedulerApplyResult["mutationKinds"] = [];
    if (timeChanged(draft) && !isResourceOccupancyDraft(draft)) {
      const { applyTournamentActivityTime } = await import(
        "@/lib/planning-hub/activity-rescheduling-mutations"
      );
      await applyTournamentActivityTime(
        item.eventId,
        draft.proposedStart,
        draft.proposedEnd,
      );
      tournamentMutationKinds.push("activity_time");
    }
    if (resourceChanged(draft) && draft.originalResourceId && draft.proposedResourceId) {
      await applyTournamentPitchSwap(item, draft.originalResourceId, draft.proposedResourceId);
      tournamentMutationKinds.push("resource_swap");
    }
    return { applied: tournamentMutationKinds.length > 0, mutationKinds: tournamentMutationKinds };
  }

  return { applied: false, mutationKinds };
}
