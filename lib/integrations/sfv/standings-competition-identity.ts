import { evaluateStandingsScheduleEvidence } from "./standings-schedule-membership";

/**
 * Schedule-derived SFV competition tuple identity for standings resolution.
 *
 * Current-phase tuple rule (documented for tests):
 *   1. Consider completed and upcoming league-match evidence for the mapped
 *      external team, season, and (when known) providerLeagueId.
 *   2. Group evidence by (providerLeagueId, providerDivisionId). When schedule
 *      rows carry providerGroupId, derive a non-tied dominant group for the
 *      winning tuple; otherwise providerGroupId stays null and ranking
 *      resolution supplies group when needed.
 *   3. For each tuple, latestActivityAt = max(
 *        latest completed kickoff,
 *        earliest upcoming kickoff when any upcoming fixtures exist,
 *      ).
 *   4. Pick the tuple with the greatest latestActivityAt; tie-break upcoming
 *      count, completed count, lower division id, lower league id.
 *   5. One-off guard: a tuple with one completed match and no upcoming fixtures
 *      cannot win over another tuple with two or more completed matches when
 *      the single-match kickoff is not strictly after every challenger kickoff.
 *
 * Standings-counting matches (integrity evidence):
 *   - Same (league, division[, group]) as the resolved standings competition
 *   - Completed lifecycle, kickoff not after `now`
 *   - Count distinct externalMatchId (provider round numbers may be reused)
 *   - Membership uses persisted provider competition metadata (matchType, cupId,
 *     groupId) — see standings-schedule-membership.ts
 */

export type StandingsCompetitionTuple = {
  providerLeagueId: number;
  providerDivisionId: number;
  /** Null when identity is schedule-derived (group is not on match mappings). */
  providerGroupId: number | null;
};

export type StandingsScheduleMatchEvidence = {
  /** SFV matchId — canonical provider match identity. */
  externalMatchId: number;
  providerLeagueId: number | null;
  providerDivisionId: number | null;
  providerRoundNbr: number | null;
  providerGroupId: number | null;
  providerMatchType: number | null;
  providerCupId: number | null;
  startAt: Date;
  isCompleted: boolean;
  isUpcoming: boolean;
};

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function tupleKey(leagueId: number, divisionId: number): string {
  return `${leagueId}:${divisionId}`;
}

function isValidTupleMatch(
  match: StandingsScheduleMatchEvidence,
  options: { providerLeagueId?: number | null },
): match is StandingsScheduleMatchEvidence & {
  providerLeagueId: number;
  providerDivisionId: number;
} {
  if (
    match.providerLeagueId == null ||
    !isPositiveInteger(match.providerLeagueId) ||
    match.providerDivisionId == null ||
    !Number.isInteger(match.providerDivisionId) ||
    match.providerDivisionId < 0
  ) {
    return false;
  }

  if (
    options.providerLeagueId != null &&
    isPositiveInteger(options.providerLeagueId) &&
    match.providerLeagueId !== options.providerLeagueId
  ) {
    return false;
  }

  return true;
}

type TupleActivity = {
  leagueId: number;
  divisionId: number;
  latestActivityAt: number;
  upcomingCount: number;
  completedCount: number;
  latestCompletedAt: number | null;
  earliestUpcomingAt: number | null;
};

function buildTupleActivityMap(
  matches: readonly StandingsScheduleMatchEvidence[],
  options: { providerLeagueId?: number | null },
): Map<string, TupleActivity> {
  const map = new Map<string, TupleActivity>();

  for (const match of matches) {
    if (!isValidTupleMatch(match, options)) {
      continue;
    }

    const key = tupleKey(match.providerLeagueId, match.providerDivisionId);
    let activity = map.get(key);
    if (!activity) {
      activity = {
        leagueId: match.providerLeagueId,
        divisionId: match.providerDivisionId,
        latestActivityAt: 0,
        upcomingCount: 0,
        completedCount: 0,
        latestCompletedAt: null,
        earliestUpcomingAt: null,
      };
      map.set(key, activity);
    }

    const startMs = match.startAt.getTime();

    if (match.isCompleted) {
      activity.completedCount += 1;
      activity.latestCompletedAt =
        activity.latestCompletedAt == null
          ? startMs
          : Math.max(activity.latestCompletedAt, startMs);
    }

    if (match.isUpcoming) {
      activity.upcomingCount += 1;
      activity.earliestUpcomingAt =
        activity.earliestUpcomingAt == null
          ? startMs
          : Math.min(activity.earliestUpcomingAt, startMs);
    }
  }

  for (const activity of map.values()) {
    const completedPart = activity.latestCompletedAt ?? 0;
    const upcomingPart = activity.earliestUpcomingAt ?? 0;
    activity.latestActivityAt =
      activity.upcomingCount > 0
        ? Math.max(completedPart, upcomingPart)
        : completedPart;
  }

  return map;
}

function compareTupleActivity(left: TupleActivity, right: TupleActivity): number {
  if (right.latestActivityAt !== left.latestActivityAt) {
    return right.latestActivityAt - left.latestActivityAt;
  }
  if (right.upcomingCount !== left.upcomingCount) {
    return right.upcomingCount - left.upcomingCount;
  }
  if (right.completedCount !== left.completedCount) {
    return right.completedCount - left.completedCount;
  }
  if (left.divisionId !== right.divisionId) {
    return left.divisionId - right.divisionId;
  }
  return left.leagueId - right.leagueId;
}

function isOneOffTuple(activity: TupleActivity): boolean {
  return activity.completedCount === 1 && activity.upcomingCount === 0;
}

function oneOffLosesTo(
  candidate: TupleActivity,
  other: TupleActivity,
): boolean {
  if (!isOneOffTuple(candidate) || other.completedCount < 2) {
    return false;
  }
  if (candidate.latestCompletedAt == null || other.latestCompletedAt == null) {
    return true;
  }
  return candidate.latestCompletedAt <= other.latestCompletedAt;
}

function selectCurrentTuple(activities: TupleActivity[]): TupleActivity | null {
  if (activities.length === 0) {
    return null;
  }

  const ranked = [...activities].sort(compareTupleActivity);

  for (const candidate of ranked) {
    let disqualified = false;
    for (const other of ranked) {
      if (other === candidate) {
        continue;
      }
      if (oneOffLosesTo(candidate, other)) {
        disqualified = true;
        break;
      }
    }
    if (!disqualified) {
      return candidate;
    }
  }

  return ranked[0] ?? null;
}

/**
 * Dominant provider group id from schedule rows that already carry group metadata.
 * Returns null when no positive group ids exist or counts tie (no guess).
 */
export function deriveProviderGroupIdFromMatchEvidence(
  matches: readonly StandingsScheduleMatchEvidence[],
  tuple: Pick<StandingsCompetitionTuple, "providerLeagueId" | "providerDivisionId">,
): number | null {
  const counts = new Map<number, number>();

  for (const match of matches) {
    if (match.providerLeagueId !== tuple.providerLeagueId) {
      continue;
    }
    if (match.providerDivisionId !== tuple.providerDivisionId) {
      continue;
    }
    if (
      match.providerGroupId == null ||
      !Number.isInteger(match.providerGroupId) ||
      match.providerGroupId <= 0
    ) {
      continue;
    }

    counts.set(
      match.providerGroupId,
      (counts.get(match.providerGroupId) ?? 0) + 1,
    );
  }

  if (counts.size === 0) {
    return null;
  }

  let dominantGroupId: number | null = null;
  let dominantCount = 0;
  let tied = false;

  for (const [groupId, count] of counts.entries()) {
    if (count > dominantCount) {
      dominantGroupId = groupId;
      dominantCount = count;
      tied = false;
    } else if (count === dominantCount) {
      tied = true;
    }
  }

  return tied ? null : dominantGroupId;
}

/**
 * Derives the current (league, division) competition phase from schedule evidence.
 */
export function deriveCurrentCompetitionTupleFromMatchEvidence(
  matches: readonly StandingsScheduleMatchEvidence[],
  options: { providerLeagueId?: number | null },
): StandingsCompetitionTuple | null {
  const activities = buildTupleActivityMap(matches, options);
  const winner = selectCurrentTuple([...activities.values()]);
  if (!winner || winner.latestActivityAt <= 0) {
    return null;
  }

  const providerGroupId = deriveProviderGroupIdFromMatchEvidence(matches, {
    providerLeagueId: winner.leagueId,
    providerDivisionId: winner.divisionId,
  });

  return {
    providerLeagueId: winner.leagueId,
    providerDivisionId: winner.divisionId,
    providerGroupId,
  };
}

/** @deprecated Alias — volume-based naming retained for call sites. */
export const deriveDominantCompetitionTupleFromMatchEvidence =
  deriveCurrentCompetitionTupleFromMatchEvidence;

/**
 * Counts completed matches that correspond to standings.played semantics for the tuple.
 */
export function countStandingsCountingMatchesForCompetitionTuple(
  matches: readonly StandingsScheduleMatchEvidence[],
  tuple: StandingsCompetitionTuple,
  options?: {
    now?: Date;
    authoritativeGroupId?: number | null;
  },
): number {
  return evaluateStandingsScheduleEvidence(matches, tuple, options)
    .completedRelevantMatches;
}

export function countMatchEvidenceForCompetitionTuple(
  matches: readonly StandingsScheduleMatchEvidence[],
  tuple: StandingsCompetitionTuple,
  externalTeamFilterApplied: boolean,
  options?: { now?: Date },
): number {
  void externalTeamFilterApplied;
  return countStandingsCountingMatchesForCompetitionTuple(matches, tuple, options ?? {});
}

export type StandingsTableCompetitionHint = {
  providerDivisionId?: number | null;
  providerGroupId?: number | null;
};
