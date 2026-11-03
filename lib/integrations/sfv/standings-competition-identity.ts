/**
 * Schedule-derived SFV competition tuple identity for standings resolution.
 *
 * Dominant tuple rule (documented for tests):
 *   1. Consider only completed league-match evidence for the mapped external
 *      team, season, and (when known) providerLeagueId.
 *   2. Group evidence by (providerLeagueId, providerDivisionId). Group id is
 *      not persisted on MatchExternalMapping — schedule evidence never sets
 *      providerGroupId; ranking resolution supplies group when needed.
 *   3. Pick the tuple with the highest completed-match count.
 *   4. Tie-break: lower providerDivisionId, then lower providerLeagueId
 *      (deterministic; does not use legacy "lowest tuple wins" for dominance).
 */

export type StandingsCompetitionTuple = {
  providerLeagueId: number;
  providerDivisionId: number;
  /** Null when identity is schedule-derived (group is not on match mappings). */
  providerGroupId: number | null;
};

export type StandingsScheduleMatchEvidence = {
  providerLeagueId: number | null;
  providerDivisionId: number | null;
};

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function tupleKey(leagueId: number, divisionId: number): string {
  return `${leagueId}:${divisionId}`;
}

/**
 * Derives the dominant (league, division) tuple from completed match counts.
 */
export function deriveDominantCompetitionTupleFromMatchEvidence(
  matches: readonly StandingsScheduleMatchEvidence[],
  options: { providerLeagueId?: number | null },
): StandingsCompetitionTuple | null {
  const counts = new Map<string, { leagueId: number; divisionId: number; count: number }>();

  for (const match of matches) {
    if (
      match.providerLeagueId == null ||
      !isPositiveInteger(match.providerLeagueId) ||
      match.providerDivisionId == null ||
      !Number.isInteger(match.providerDivisionId) ||
      match.providerDivisionId < 0
    ) {
      continue;
    }

    if (
      options.providerLeagueId != null &&
      isPositiveInteger(options.providerLeagueId) &&
      match.providerLeagueId !== options.providerLeagueId
    ) {
      continue;
    }

    const key = tupleKey(match.providerLeagueId, match.providerDivisionId);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        leagueId: match.providerLeagueId,
        divisionId: match.providerDivisionId,
        count: 1,
      });
    }
  }

  if (counts.size === 0) {
    return null;
  }

  const ranked = [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    if (left.divisionId !== right.divisionId) {
      return left.divisionId - right.divisionId;
    }
    return left.leagueId - right.leagueId;
  });

  const winner = ranked[0]!;
  return {
    providerLeagueId: winner.leagueId,
    providerDivisionId: winner.divisionId,
    providerGroupId: null,
  };
}

export function countMatchEvidenceForCompetitionTuple(
  matches: readonly StandingsScheduleMatchEvidence[],
  tuple: StandingsCompetitionTuple,
  externalTeamFilterApplied: boolean,
): number {
  void externalTeamFilterApplied;
  let count = 0;
  for (const match of matches) {
    if (match.providerLeagueId !== tuple.providerLeagueId) {
      continue;
    }
    if (match.providerDivisionId !== tuple.providerDivisionId) {
      continue;
    }
    count += 1;
  }
  return count;
}

export type StandingsTableCompetitionHint = {
  providerDivisionId?: number | null;
  providerGroupId?: number | null;
};
