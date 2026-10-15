import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { teamSeasonLookupKey } from "@/lib/weekplanner/match-team-season-resolution";
import {
  isMatchParticipatingTeam,
  matchParticipatingCanonicalTeamIds,
} from "./match-team-relevance";
import type { PersonProgrammeScope } from "./person-programme-scope";

/** PERSON scope: canonical participating team ∩ person's relevant teams. */
export function isMatchRelevantToPersonProgrammeScope(
  match: MatchcenterMatchSummary,
  scope: PersonProgrammeScope,
): boolean {
  if (scope.relevantTeamIds.length === 0) {
    return false;
  }
  return scope.relevantTeamIds.some((teamId) => isMatchParticipatingTeam(match, teamId));
}

/** Lookup rows for all relevant teams on matches they participate in (SFV null teamSeasonId). */
export function programmeMatchTeamSeasonLookupKeysForPersonScope(
  matches: readonly MatchcenterMatchSummary[],
  relevantTeamIds: readonly string[],
): Array<{ teamId: string; seasonId: string }> {
  const relevant = new Set(relevantTeamIds);
  const seen = new Set<string>();
  const keys: Array<{ teamId: string; seasonId: string }> = [];

  for (const match of matches) {
    const seasonId = match.seasonId?.trim();
    if (!seasonId) continue;
    for (const teamId of matchParticipatingCanonicalTeamIds(match)) {
      if (!relevant.has(teamId)) continue;
      const key = teamSeasonLookupKey(teamId, seasonId);
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push({ teamId, seasonId });
    }
  }

  return keys;
}
