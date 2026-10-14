import {
  fetchAllClubDirectoryBrowseClubs,
  fetchClubDirectoryClubsPage,
  type ClubDirectoryClientClub,
} from "@/lib/club-directory/club-directory-client";
import { projectClientClubToSelectable, projectTeamSummaryDtoToSelectable } from "./selectable-projection";
import type { SceSelectableClub, SceSelectableTeam } from "./types";

type SelectableClubsApiResponse = {
  clubs?: ClubDirectoryClientClub[];
  error?: string;
};

type SelectableTeamsApiResponse = {
  teams?: Array<{
    id: string;
    clubId: string;
    name: string;
    shortName: string | null;
    categoryLabel: string | null;
    ageGroup?: string | null;
    genderGroup?: string | null;
  }>;
  error?: string;
};

export async function fetchAllSelectableClubs(options?: {
  signal?: AbortSignal;
}): Promise<SceSelectableClub[]> {
  const clubs = await fetchAllClubDirectoryBrowseClubs({ signal: options?.signal });
  return clubs.map(projectClientClubToSelectable);
}

export async function fetchSelectableClubsPage(input: {
  search?: string;
  skip?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ clubs: SceSelectableClub[]; hasMore: boolean }> {
  const { clubs, meta } = await fetchClubDirectoryClubsPage({
    search: input.search,
    skip: input.skip,
    limit: input.limit,
    signal: input.signal,
  });
  return {
    clubs: clubs.map(projectClientClubToSelectable),
    hasMore: meta.hasMore,
  };
}

export async function fetchSelectableTeamsForClub(input: {
  clubId: string;
  signal?: AbortSignal;
}): Promise<SceSelectableTeam[]> {
  const res = await fetch(`/api/clubs/selectable/${encodeURIComponent(input.clubId)}/teams`, {
    cache: "no-store",
    signal: input.signal,
  });
  const data = (await res.json().catch(() => null)) as SelectableTeamsApiResponse | null;
  if (!res.ok) {
    throw new Error(data?.error ?? "Teams konnten nicht geladen werden.");
  }
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  return teams.map((team) => ({
    id: team.id,
    clubId: team.clubId,
    name: team.name,
    shortName: team.shortName,
    categoryLabel: team.categoryLabel,
    ageGroup: team.ageGroup ?? null,
    genderGroup: team.genderGroup ?? null,
  }));
}

/** Server-side projection helper for API routes. */
export { projectTeamSummaryDtoToSelectable };
