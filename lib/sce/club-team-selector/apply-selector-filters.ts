import type { SceClubTeamSelectorFilters, SceSelectableClub, SceSelectableTeam } from "./types";

export function applyClubSelectorFilters(
  clubs: readonly SceSelectableClub[],
  filters?: SceClubTeamSelectorFilters,
): SceSelectableClub[] {
  if (!filters) return [...clubs];

  let result = [...clubs];

  if (filters.activeOnly !== false) {
    result = result.filter((club) => club.status === "active");
  }

  if (filters.allowedClubIds?.length) {
    const allowed = new Set(filters.allowedClubIds);
    result = result.filter((club) => allowed.has(club.id));
  }

  if (filters.excludeClubIds?.length) {
    const excluded = new Set(filters.excludeClubIds);
    result = result.filter((club) => !excluded.has(club.id));
  }

  return result;
}

export function applyTeamSelectorFilters(
  teams: readonly SceSelectableTeam[],
  filters?: SceClubTeamSelectorFilters,
): SceSelectableTeam[] {
  if (!filters) return [...teams];

  let result = [...teams];

  if (filters.allowedTeamIds?.length) {
    const allowed = new Set(filters.allowedTeamIds);
    result = result.filter((team) => allowed.has(team.id));
  }

  return result;
}
