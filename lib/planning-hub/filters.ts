/**
 * PLANNING-HUB-01 — client-side filters over an already-resolved Weekplanner week.
 */

import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import type { PlanningHubActivityFilter, PlanningHubUrlState } from "./planner-url";

function itemMatchesActivity(item: WeekplannerItem, activity: PlanningHubActivityFilter): boolean {
  if (activity === "alle") return true;
  if (activity === "trainings") return item.type === "TRAINING";
  if (activity === "spiele") return item.type === "MATCH";
  if (activity === "turniere") return item.type === "TOURNAMENT";
  if (activity === "veranstaltungen") return item.type === "VERANSTALTUNG";
  return true;
}

function itemUsesFacility(item: WeekplannerItem, facilityId: string): boolean {
  const refs = [
    ...item.pitchAllocations,
    ...item.dressingRoomAllocations,
    ...(item.type === "MATCH" ? item.awayDressingRoomAllocations : []),
    ...(item.type === "TOURNAMENT"
      ? item.participantAllocations.flatMap((p) => p.dressingRoomAllocations)
      : []),
  ];
  return refs.some((ref) => ref.facilityId === facilityId);
}

function itemMatchesTeam(item: WeekplannerItem, teamKey: string): boolean {
  if (item.type === "TRAINING") {
    return item.teamSeasonId === teamKey;
  }
  if (item.type === "VERANSTALTUNG" && item.teamSeasonId) {
    return item.teamSeasonId === teamKey;
  }
  return item.teamNames.some((name) => name === teamKey);
}

export function filterWeekplannerItem(
  item: WeekplannerItem,
  state: Pick<PlanningHubUrlState, "activity" | "team" | "facility" | "conflictsOnly">,
): boolean {
  if (!itemMatchesActivity(item, state.activity)) return false;
  if (state.team && !itemMatchesTeam(item, state.team)) return false;
  if (state.facility && !itemUsesFacility(item, state.facility)) return false;
  if (state.conflictsOnly && item.conflicts.length === 0) return false;
  return true;
}

export function applyPlanningHubFilters(
  week: WeekplannerWeek,
  state: Pick<PlanningHubUrlState, "activity" | "team" | "facility" | "conflictsOnly">,
): WeekplannerWeek {
  return {
    ...week,
    days: week.days.map((day) => ({
      ...day,
      items: day.items.filter((item) => filterWeekplannerItem(item, state)),
    })),
  };
}
