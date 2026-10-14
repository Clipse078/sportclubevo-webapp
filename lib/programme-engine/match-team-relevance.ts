import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { teamSeasonLookupKey } from "@/lib/weekplanner/match-team-season-resolution";

/** Canonical tenant Team ids participating in a match (home or away). */
export function matchParticipatingCanonicalTeamIds(
  match: MatchcenterMatchSummary,
): readonly string[] {
  const ids: string[] = [];
  if (match.home.canonicalTeamId) ids.push(match.home.canonicalTeamId);
  if (match.away.canonicalTeamId) ids.push(match.away.canonicalTeamId);
  if (ids.length > 0) return ids;

  const eventTeamId = match.teamId?.trim();
  return eventTeamId ? [eventTeamId] : [];
}

export function isMatchParticipatingTeam(
  match: MatchcenterMatchSummary,
  teamId: string,
): boolean {
  return matchParticipatingCanonicalTeamIds(match).includes(teamId);
}

/**
 * TeamSeason id for a participating tenant team on this match summary.
 * Reuses the Weekplanner SFV/provider resolution path (Event.teamSeasonId when
 * set, otherwise teamId + seasonId lookup).
 */
export function resolveProgrammeMatchTeamSeasonIdForTeam(
  match: MatchcenterMatchSummary,
  participatingTeamId: string,
  teamSeasonIdByTeamAndSeason: ReadonlyMap<string, string>,
): string | null {
  if (!isMatchParticipatingTeam(match, participatingTeamId)) {
    return null;
  }

  const persisted = match.teamSeasonId?.trim();
  if (persisted && match.teamId?.trim() === participatingTeamId) {
    return persisted;
  }

  const seasonId = match.seasonId?.trim();
  if (!seasonId) return null;

  return teamSeasonIdByTeamAndSeason.get(teamSeasonLookupKey(participatingTeamId, seasonId)) ?? null;
}

export function isMatchRelevantToTeamProgrammeScope(
  match: MatchcenterMatchSummary,
  scope: { teamId: string; teamSeasonId: string },
  teamSeasonIdByTeamAndSeason: ReadonlyMap<string, string>,
): boolean {
  if (!isMatchParticipatingTeam(match, scope.teamId)) {
    return false;
  }

  const resolvedTeamSeasonId = resolveProgrammeMatchTeamSeasonIdForTeam(
    match,
    scope.teamId,
    teamSeasonIdByTeamAndSeason,
  );

  return resolvedTeamSeasonId === scope.teamSeasonId;
}

/** Ensures lookup rows exist for a scoped team on matches it participates in. */
export function programmeMatchTeamSeasonLookupKeysForScope(
  matches: readonly MatchcenterMatchSummary[],
  scopeTeamId: string,
): Array<{ teamId: string; seasonId: string }> {
  const keys: Array<{ teamId: string; seasonId: string }> = [];
  for (const match of matches) {
    if (!isMatchParticipatingTeam(match, scopeTeamId)) continue;
    const seasonId = match.seasonId?.trim();
    if (!seasonId) continue;
    keys.push({ teamId: scopeTeamId, seasonId });
  }
  return keys;
}
