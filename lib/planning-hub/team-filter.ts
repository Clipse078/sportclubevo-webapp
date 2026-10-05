/**
 * SCE-PLANNER-UX-08-06R1 — canonical team filter keys (TeamSeason ids), not display labels.
 */

import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";

export type PlanningHubTeamOption = { value: string; label: string };

/** Canonical TeamSeason ids associated with an item for hub team filtering. */
export function weekplannerItemTeamSeasonIds(item: WeekplannerItem): string[] {
  switch (item.type) {
    case "TRAINING":
      return item.teamSeasonId ? [item.teamSeasonId] : [];
    case "VERANSTALTUNG":
      return item.teamSeasonId ? [item.teamSeasonId] : [];
    case "MATCH":
      return item.teamSeasonId ? [item.teamSeasonId] : [];
    case "TOURNAMENT":
      return item.teamSeasonIds.length > 0 ? [...item.teamSeasonIds] : [];
    default:
      return [];
  }
}

function preferredTeamOptionLabel(item: WeekplannerItem): string | null {
  if (item.teamNames.length > 0) return item.teamNames[0] ?? null;
  return item.title || null;
}

/** Build team filter options from a resolved week — values are TeamSeason ids. */
export function buildPlanningHubTeamOptions(week: WeekplannerWeek): PlanningHubTeamOption[] {
  const map = new Map<string, string>();
  for (const day of week.days) {
    for (const item of day.items) {
      const label = preferredTeamOptionLabel(item);
      if (!label) continue;
      for (const id of weekplannerItemTeamSeasonIds(item)) {
        const existing = map.get(id);
        if (!existing || label.length > existing.length) {
          map.set(id, label);
        }
      }
    }
  }
  return [...map.entries()]
    .map(([value, optionLabel]) => ({ value, label: optionLabel }))
    .sort((a, b) => a.label.localeCompare(b.label, "de-CH"));
}
