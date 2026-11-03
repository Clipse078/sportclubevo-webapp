/**
 * Standings competition membership — separates provider match identity from
 * whether a fixture contributes to the resolved league table evidence.
 */

import type {
  StandingsCompetitionTuple,
  StandingsScheduleMatchEvidence,
} from "./standings-competition-identity";

export type StandingsEvidenceConfidence = "COMPLETE" | "PARTIAL" | "INSUFFICIENT";

/** Why schedule membership evidence is not authoritative enough for stale decisions. */
export type StandingsEvidenceNonAuthoritativeReason =
  | "MISSING_PROVIDER_MATCH_TYPE"
  | "HEURISTIC_DOMINANT_MATCH_TYPE_TIED"
  | "HEURISTIC_DOMINANT_MATCH_TYPE"
  | "INCOMPLETE_GROUP_METADATA";

export type StandingsScheduleEvidenceEvaluation = {
  completedRelevantMatches: number;
  confidence: StandingsEvidenceConfidence;
  dominantProviderMatchType: number | null;
  competitionIdentity: StandingsCompetitionTuple;
  /** Set when confidence is not COMPLETE — explains why evidence is non-authoritative. */
  nonAuthoritativeReason: StandingsEvidenceNonAuthoritativeReason | null;
};

export type EvaluateStandingsScheduleEvidenceOptions = {
  now?: Date;
  /** Group id from the resolved SFV ranking anchor when available. */
  authoritativeGroupId?: number | null;
  /**
   * Provider matchType values with contract-proven league-table semantics.
   * Omit in production — SFV OpenAPI does not document matchType enums today.
   * Tests (and future SFV semantics) may supply this to reach COMPLETE safely.
   */
  provenAuthoritativeLeagueTableMatchTypes?: readonly number[];
};

function isCupFixture(cupId: number | null | undefined): boolean {
  return cupId != null && Number.isInteger(cupId) && cupId > 0;
}

function groupFilterId(
  authoritativeGroupId: number | null | undefined,
  tupleGroupId: number | null | undefined,
): number | null {
  if (authoritativeGroupId != null && Number.isInteger(authoritativeGroupId)) {
    return authoritativeGroupId > 0 ? authoritativeGroupId : null;
  }
  if (tupleGroupId != null && Number.isInteger(tupleGroupId) && tupleGroupId > 0) {
    return tupleGroupId;
  }
  return null;
}

function matchesCompetitionTuple(
  match: StandingsScheduleMatchEvidence,
  tuple: StandingsCompetitionTuple,
  now: Date,
): boolean {
  if (!match.isCompleted || match.startAt.getTime() > now.getTime()) {
    return false;
  }
  if (match.providerLeagueId !== tuple.providerLeagueId) {
    return false;
  }
  if (match.providerDivisionId !== tuple.providerDivisionId) {
    return false;
  }
  if (
    !Number.isInteger(match.externalMatchId) ||
    match.externalMatchId <= 0
  ) {
    return false;
  }
  return true;
}

function matchesAuthoritativeGroup(
  match: StandingsScheduleMatchEvidence,
  requiredGroupId: number | null,
): boolean {
  if (requiredGroupId == null) {
    return true;
  }
  return match.providerGroupId === requiredGroupId;
}

function deriveDominantProviderMatchType(
  matchTypes: readonly number[],
): { dominant: number | null; tied: boolean } {
  if (matchTypes.length === 0) {
    return { dominant: null, tied: false };
  }

  const counts = new Map<number, number>();
  for (const matchType of matchTypes) {
    counts.set(matchType, (counts.get(matchType) ?? 0) + 1);
  }

  let dominant: number | null = null;
  let dominantCount = 0;
  let tied = false;

  for (const [matchType, count] of counts.entries()) {
    if (count > dominantCount) {
      dominant = matchType;
      dominantCount = count;
      tied = false;
    } else if (count === dominantCount) {
      tied = true;
    }
  }

  if (tied) {
    return { dominant: null, tied: true };
  }

  return { dominant, tied: false };
}

function isDominantMatchTypeAuthoritative(
  dominant: number,
  provenTypes: readonly number[] | undefined,
): boolean {
  return (
    provenTypes != null &&
    provenTypes.length > 0 &&
    provenTypes.includes(dominant)
  );
}

/**
 * Evaluates how many completed schedule fixtures belong to the resolved standings
 * competition, and whether the evidence is authoritative enough for stale detection.
 */
export function evaluateStandingsScheduleEvidence(
  matches: readonly StandingsScheduleMatchEvidence[],
  tuple: StandingsCompetitionTuple,
  options?: EvaluateStandingsScheduleEvidenceOptions,
): StandingsScheduleEvidenceEvaluation {
  const now = options?.now ?? new Date();
  const requiredGroupId = groupFilterId(
    options?.authoritativeGroupId,
    tuple.providerGroupId,
  );

  const inTuple = matches.filter((match) =>
    matchesCompetitionTuple(match, tuple, now),
  );

  if (inTuple.some((match) => match.providerMatchType == null)) {
    const providerMatchIds = new Set<number>();
    for (const match of inTuple) {
      if (
        match.providerMatchType != null &&
        !isCupFixture(match.providerCupId) &&
        matchesAuthoritativeGroup(match, requiredGroupId)
      ) {
        providerMatchIds.add(match.externalMatchId);
      }
    }

    return {
      completedRelevantMatches: providerMatchIds.size,
      confidence: "INSUFFICIENT",
      dominantProviderMatchType: null,
      competitionIdentity: tuple,
      nonAuthoritativeReason: "MISSING_PROVIDER_MATCH_TYPE",
    };
  }

  const leagueTableCandidates = inTuple.filter(
    (match) =>
      !isCupFixture(match.providerCupId) &&
      matchesAuthoritativeGroup(match, requiredGroupId),
  );

  const { dominant, tied } = deriveDominantProviderMatchType(
    leagueTableCandidates.map((match) => match.providerMatchType as number),
  );

  if (tied || dominant == null) {
    const providerMatchIds = new Set<number>();
    for (const match of leagueTableCandidates) {
      providerMatchIds.add(match.externalMatchId);
    }

    return {
      completedRelevantMatches: providerMatchIds.size,
      confidence: "PARTIAL",
      dominantProviderMatchType: null,
      competitionIdentity: tuple,
      nonAuthoritativeReason: "HEURISTIC_DOMINANT_MATCH_TYPE_TIED",
    };
  }

  const providerMatchIds = new Set<number>();
  for (const match of leagueTableCandidates) {
    if (match.providerMatchType !== dominant) {
      continue;
    }
    providerMatchIds.add(match.externalMatchId);
  }

  const groupIncomplete =
    requiredGroupId != null &&
    inTuple.some(
      (match) =>
        !isCupFixture(match.providerCupId) &&
        match.providerMatchType != null &&
        match.providerGroupId == null,
    );

  const dominantIsProvenAuthoritative = isDominantMatchTypeAuthoritative(
    dominant,
    options?.provenAuthoritativeLeagueTableMatchTypes,
  );

  if (
    !groupIncomplete &&
    dominantIsProvenAuthoritative
  ) {
    return {
      completedRelevantMatches: providerMatchIds.size,
      confidence: "COMPLETE",
      dominantProviderMatchType: dominant,
      competitionIdentity: tuple,
      nonAuthoritativeReason: null,
    };
  }

  return {
    completedRelevantMatches: providerMatchIds.size,
    confidence: "PARTIAL",
    dominantProviderMatchType: dominant,
    competitionIdentity: tuple,
    nonAuthoritativeReason: groupIncomplete
      ? "INCOMPLETE_GROUP_METADATA"
      : "HEURISTIC_DOMINANT_MATCH_TYPE",
  };
}

export function hasAuthoritativeStandingsScheduleEvidence(
  evaluation: StandingsScheduleEvidenceEvaluation,
): boolean {
  return evaluation.confidence === "COMPLETE";
}
