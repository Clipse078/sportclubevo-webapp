export type ClubDirectoryListItem = {
  id: string;
  name: string;
  shortName: string | null;
  alternativeName: string | null;
  logoUrl: string | null;
  source: string;
  archivedAt: string | null;
  teamCount: number;
  hasProviderMapping: boolean;
};

export type ClubDirectoryProviderFilter = "all" | "linked" | "manual";
export type ClubDirectoryTeamsFilter = "all" | "with" | "without";

export function parseClubDirectoryProviderFilter(
  value: string | undefined,
): ClubDirectoryProviderFilter {
  if (value === "linked" || value === "manual") return value;
  return "all";
}

export function parseClubDirectoryTeamsFilter(value: string | undefined): ClubDirectoryTeamsFilter {
  if (value === "with" || value === "without") return value;
  return "all";
}

export function clubDirectoryFiltersActive(
  provider: ClubDirectoryProviderFilter,
  teams: ClubDirectoryTeamsFilter,
): boolean {
  return provider !== "all" || teams !== "all";
}

export function applyClubDirectoryViewFilters(
  clubs: ClubDirectoryListItem[],
  provider: ClubDirectoryProviderFilter,
  teams: ClubDirectoryTeamsFilter,
): ClubDirectoryListItem[] {
  return clubs.filter((club) => {
    if (provider === "linked" && !club.hasProviderMapping) return false;
    if (provider === "manual" && club.hasProviderMapping) return false;
    if (teams === "with" && club.teamCount <= 0) return false;
    if (teams === "without" && club.teamCount > 0) return false;
    return true;
  });
}

export const CLUB_DIRECTORY_PROVIDER_FILTER_LABELS: Record<ClubDirectoryProviderFilter, string> = {
  all: "Alle",
  linked: "Anbieter-verknüpft",
  manual: "Manuell",
};

export const CLUB_DIRECTORY_TEAMS_FILTER_LABELS: Record<ClubDirectoryTeamsFilter, string> = {
  all: "Alle",
  with: "Mit Teams",
  without: "Ohne Teams",
};
