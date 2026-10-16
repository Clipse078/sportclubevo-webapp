import type { ProgrammeActivityKind } from "@/lib/programme-engine/types";
import type {
  PersonalProgrammeItem,
  PersonalProgrammeSourceType,
} from "./personal-programme-types";

function sourceTypeToActivityKind(
  sourceType: PersonalProgrammeSourceType,
): ProgrammeActivityKind | null {
  switch (sourceType) {
    case "TRAINING":
      return "TRAINING";
    case "MATCH":
      return "MATCH";
    case "TOURNAMENT":
      return "TOURNAMENT";
    case "EVENT":
      return "CLUB_EVENT";
    case "MEETING":
      return null;
    default: {
      const _exhaustive: never = sourceType;
      return _exhaustive;
    }
  }
}

export type PersonalProgrammeClientFilters = {
  teamIds: string[];
  activityKinds: ProgrammeActivityKind[];
};

export function filterPersonalProgrammeItems(
  items: PersonalProgrammeItem[],
  filters: PersonalProgrammeClientFilters,
): PersonalProgrammeItem[] {
  const teamFilter = filters.teamIds.length > 0;
  const kindFilter = filters.activityKinds.length > 0;
  if (!teamFilter && !kindFilter) return items;

  const teamSet = new Set(filters.teamIds);
  const kindSet = new Set(filters.activityKinds);

  return items.filter((item) => {
    if (teamFilter) {
      const teamId = item.programmeScopeTeamId;
      if (!teamId || !teamSet.has(teamId)) return false;
    }
    if (kindFilter) {
      const kind = sourceTypeToActivityKind(item.sourceType);
      if (!kind || !kindSet.has(kind)) return false;
    }
    return true;
  });
}

export function personalProgrammeFiltersActive(
  filters: PersonalProgrammeClientFilters,
): boolean {
  return filters.teamIds.length > 0 || filters.activityKinds.length > 0;
}

export function filtersFromMeinProgrammUrlState(state: {
  teamIds: string[];
  activityKinds: ProgrammeActivityKind[];
}): PersonalProgrammeClientFilters {
  return {
    teamIds: state.teamIds,
    activityKinds: state.activityKinds,
  };
}
