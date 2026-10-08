/**
 * SCE-PLANNER-UX-08-08D — shared identity checks across Kalender / resource timelines / Liste.
 *
 * All perspectives consume the same `WeekplannerWeek` payload; filters only hide items —
 * they must not rewrite activity identity or silently drop cross-domain activities.
 */

import { filterWeekplannerItem } from "@/lib/planning-hub/filters";
import {
  listOperationalItemVisible,
  type ListOperationalFilterState,
} from "@/lib/planning-hub/list-operational";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";

export function weekplannerItemIds(week: WeekplannerWeek): Set<string> {
  return new Set(week.days.flatMap((day) => day.items.map((item) => item.id)));
}

export function collectDressingResourceRefs(item: WeekplannerItem) {
  const refs = [...item.dressingRoomAllocations];
  if (item.type === "MATCH") refs.push(...item.awayDressingRoomAllocations);
  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      refs.push(...participant.dressingRoomAllocations);
    }
  }
  return refs;
}

export function itemUsesPitchResource(item: WeekplannerItem, facilityResourceId: string): boolean {
  return item.pitchAllocations.some((ref) => ref.facilityResourceId === facilityResourceId);
}

export function itemUsesDressingResource(item: WeekplannerItem, facilityResourceId: string): boolean {
  return collectDressingResourceRefs(item).some((ref) => ref.facilityResourceId === facilityResourceId);
}

export function spielfeldVisibleItemIds(
  week: WeekplannerWeek,
  pitchResourceId: string,
  hubState: Pick<PlanningHubUrlState, "activity" | "team" | "facility" | "conflictsOnly">,
): Set<string> {
  const ids = new Set<string>();
  for (const day of week.days) {
    for (const item of day.items) {
      if (!filterWeekplannerItem(item, hubState)) continue;
      if (itemUsesPitchResource(item, pitchResourceId)) ids.add(item.id);
    }
  }
  return ids;
}

export function garderobeVisibleItemIds(
  week: WeekplannerWeek,
  dressingResourceId: string,
  hubState: Pick<PlanningHubUrlState, "activity" | "team" | "facility" | "conflictsOnly">,
): Set<string> {
  const ids = new Set<string>();
  for (const day of week.days) {
    for (const item of day.items) {
      if (!filterWeekplannerItem(item, hubState)) continue;
      if (itemUsesDressingResource(item, dressingResourceId)) ids.add(item.id);
    }
  }
  return ids;
}

export function listeVisibleItemIds(
  week: WeekplannerWeek,
  state: ListOperationalFilterState,
): Set<string> {
  const ids = new Set<string>();
  for (const day of week.days) {
    for (const item of day.items) {
      if (listOperationalItemVisible(item, state)) ids.add(item.id);
    }
  }
  return ids;
}

export type PlannerViewIdentitySnapshot = {
  id: string;
  type: WeekplannerItem["type"];
  startMs: number;
  endMs: number;
  pitchIds: string[];
  dressingIds: string[];
  conflictCount: number;
  cancelled?: boolean;
};

export function plannerViewIdentitySnapshot(item: WeekplannerItem): PlannerViewIdentitySnapshot {
  return {
    id: item.id,
    type: item.type,
    startMs: item.startAt.getTime(),
    endMs: item.endAt.getTime(),
    pitchIds: item.pitchAllocations.map((r) => r.facilityResourceId),
    dressingIds: collectDressingResourceRefs(item).map((r) => r.facilityResourceId),
    conflictCount: item.conflicts?.length ?? 0,
  };
}
