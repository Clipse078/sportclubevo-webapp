import { normalizeClubNameForLookup } from "@/lib/club-directory/club-name-normalization";
import type { SceSelectableClub } from "./types";
import { buildSelectableClubSearchHaystack } from "./selectable-projection";

export function normalizeSelectorSearchTerm(term: string): string {
  return normalizeClubNameForLookup(term);
}

export function filterSelectableClubsBySearch(
  clubs: readonly SceSelectableClub[],
  rawQuery: string,
): SceSelectableClub[] {
  const query = normalizeSelectorSearchTerm(rawQuery);
  if (!query) return [...clubs];

  return clubs.filter((club) => {
    const haystack = normalizeSelectorSearchTerm(buildSelectableClubSearchHaystack(club));
    return haystack.includes(query);
  });
}

export function sortSelectableClubsDeterministic(
  clubs: readonly SceSelectableClub[],
): SceSelectableClub[] {
  return [...clubs].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, "de-CH", { sensitivity: "base" });
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });
}

export function filterSelectableTeamsBySearch<T extends { name: string; shortName?: string | null }>(
  teams: readonly T[],
  rawQuery: string,
): T[] {
  const query = normalizeSelectorSearchTerm(rawQuery);
  if (!query) return [...teams];
  return teams.filter((team) => {
    const haystack = normalizeSelectorSearchTerm(
      [team.name, team.shortName].filter(Boolean).join(" "),
    );
    return haystack.includes(query);
  });
}
