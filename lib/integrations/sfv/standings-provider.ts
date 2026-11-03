/**
 * lib/integrations/sfv/standings-provider.ts
 *
 * SFV standings provider with tenant-scoped club resolution, read-through cache,
 * and durable last-known-good snapshot fallback.
 */

import type { ClubRankingEntry, ClubRankingParams } from "./client";
import type { SportingStandingsTable } from "@/lib/sporting-data/standings-types";
import { fetchClubRanking } from "./client";
import { SfvError } from "./errors";
import type { StandingsTableCompetitionHint } from "./standings-competition-identity";
import {
  buildStandingsCacheKey,
  getCachedStandingsEntries,
  setCachedStandingsEntries,
} from "./standings-cache";
import {
  evaluateStandingsStaleVsSchedule,
  findOwnStandingsRowPlayed,
  shouldPersistStandingsSnapshot,
  buildFilteredRankingParams,
} from "./standings-integrity";
import {
  loadStandingsScheduleEvidence,
  type StandingsScheduleEvidence,
} from "./standings-schedule-evidence";
import {
  evaluateStandingsScheduleEvidence,
  hasAuthoritativeStandingsScheduleEvidence,
  type StandingsScheduleEvidenceEvaluation,
} from "./standings-schedule-membership";
import {
  loadStandingsSnapshot,
  persistStandingsSnapshot,
  type LoadedStandingsSnapshot,
  type StandingsSnapshotIdentity,
} from "./standings-snapshot-repository";
import {
  resolveStandingsTableWithIdentity,
  type ResolvedStandingsTable,
} from "./standings-table";
import {
  isSfvEnabledForTenant,
  requireEnabledSfvConfigForTenant,
} from "./tenant-config-service";

export type FetchTeamStandingsInput = {
  tenantId: string;
  externalTeamId: number;
  externalSeasonId: number;
  providerLeagueId?: number | null;
  teamSeasonId?: string | null;
};

/** In-flight deduplication keyed by tenant + season (canonical cache scope). */
const inflightRankingFetches = new Map<string, Promise<ClubRankingEntry[]>>();

type StandingsFailureCategory =
  | "SFV_AUTH"
  | "SFV_TIMEOUT"
  | "SFV_UNAVAILABLE"
  | "SFV_PROVIDER_ERROR"
  | "SFV_EMPTY_OR_UNUSABLE"
  | "UNKNOWN";

type SnapshotFallbackReason =
  | { kind: "provider_failure"; error: unknown }
  | { kind: "empty_or_unusable" };

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function buildSnapshotIdentity(
  input: FetchTeamStandingsInput,
): StandingsSnapshotIdentity | null {
  if (
    input.providerLeagueId == null ||
    !isPositiveInteger(input.providerLeagueId)
  ) {
    return null;
  }

  return {
    tenantId: input.tenantId,
    externalSeasonId: input.externalSeasonId,
    externalTeamId: input.externalTeamId,
    providerLeagueId: input.providerLeagueId,
  };
}

function classifyStandingsFailure(error: unknown): StandingsFailureCategory {
  if (!(error instanceof SfvError)) {
    return "UNKNOWN";
  }

  switch (error.code) {
    case "SFV_UNAUTHORIZED":
    case "SFV_FORBIDDEN":
      return "SFV_AUTH";
    case "SFV_TIMEOUT":
      return "SFV_TIMEOUT";
    case "SFV_UNAVAILABLE":
    case "SFV_RATE_LIMITED":
      return "SFV_UNAVAILABLE";
    default:
      return "SFV_PROVIDER_ERROR";
  }
}

function isProviderFailureEligibleForSnapshotFallback(
  error: unknown,
): boolean {
  if (error instanceof SfvError) {
    switch (error.code) {
      case "CONFIGURATION_MISSING":
      case "CONFIGURATION_INVALID":
      case "CONTRACT_UNRESOLVED":
        return false;
      default:
        return true;
    }
  }

  return true;
}

function logStandingsProviderFailure(
  input: FetchTeamStandingsInput,
  error: unknown,
): void {
  const isSfvError = error instanceof SfvError;

  console.error(
    JSON.stringify({
      event: "SFV_STANDINGS_PROVIDER_FAILURE",
      tenantId: input.tenantId,
      teamSeasonId: input.teamSeasonId ?? null,
      externalTeamId: input.externalTeamId,
      externalSeasonId: input.externalSeasonId,
      providerLeagueId: input.providerLeagueId ?? null,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: isSfvError ? error.code : "INTERNAL_ERROR",
      errorMessage: isSfvError
        ? error.message
        : "An unexpected error occurred in the SFV standings provider.",
      failureCategory: classifyStandingsFailure(error),
    }),
  );
}

function resolveSnapshotFallbackDiagnostics(
  reason: SnapshotFallbackReason,
): {
  errorCode: string;
  failureCategory: StandingsFailureCategory;
} {
  if (reason.kind === "empty_or_unusable") {
    return {
      errorCode: "SFV_STANDINGS_RESOLUTION_EMPTY",
      failureCategory: "SFV_EMPTY_OR_UNUSABLE",
    };
  }

  const error = reason.error;
  const isSfvError = error instanceof SfvError;

  return {
    errorCode: isSfvError ? error.code : "INTERNAL_ERROR",
    failureCategory: classifyStandingsFailure(error),
  };
}

function logStandingsSnapshotFallback(
  input: FetchTeamStandingsInput,
  snapshot: { fetchedAt: Date },
  reason: SnapshotFallbackReason,
): void {
  const diagnostics = resolveSnapshotFallbackDiagnostics(reason);

  console.warn(
    JSON.stringify({
      event: "SFV_STANDINGS_SNAPSHOT_FALLBACK",
      tenantId: input.tenantId,
      teamSeasonId: input.teamSeasonId ?? null,
      externalTeamId: input.externalTeamId,
      externalSeasonId: input.externalSeasonId,
      providerLeagueId: input.providerLeagueId ?? null,
      snapshotFetchedAt: snapshot.fetchedAt.toISOString(),
      errorCode: diagnostics.errorCode,
      failureCategory: diagnostics.failureCategory,
    }),
  );
}

/** Test-only helper — not exposed as a public runtime API. */
export function resetStandingsInflightForTests(): void {
  inflightRankingFetches.clear();
}

async function fetchRankingEntriesWithInflightDedup(
  cacheKey: string,
  fetchRanking: () => Promise<ClubRankingEntry[]>,
): Promise<ClubRankingEntry[]> {
  const cached = getCachedStandingsEntries(cacheKey);
  if (cached) {
    return cached;
  }

  const inflight = inflightRankingFetches.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const promise = fetchRanking()
    .then((entries) => {
      setCachedStandingsEntries(cacheKey, entries);
      return entries;
    })
    .finally(() => {
      inflightRankingFetches.delete(cacheKey);
    });

  inflightRankingFetches.set(cacheKey, promise);
  return promise;
}

async function tryLoadSnapshotFallback(
  input: FetchTeamStandingsInput,
  reason: SnapshotFallbackReason,
  preloadedSnapshot?: LoadedStandingsSnapshot | null,
): Promise<SportingStandingsTable | null> {
  const identity = buildSnapshotIdentity(input);
  if (!identity) {
    return null;
  }

  if (
    reason.kind === "provider_failure" &&
    !isProviderFailureEligibleForSnapshotFallback(reason.error)
  ) {
    return null;
  }

  const snapshot =
    preloadedSnapshot !== undefined
      ? preloadedSnapshot
      : await loadStandingsSnapshot(identity);
  if (!snapshot) {
    return null;
  }

  logStandingsSnapshotFallback(input, snapshot, reason);
  return snapshot.standingsTable;
}

async function persistSuccessfulStandingsSnapshot(
  input: FetchTeamStandingsInput,
  resolved: ResolvedStandingsTable,
  fetchedAt: Date,
): Promise<void> {
  const identity = buildSnapshotIdentity(input);
  if (!identity) {
    return;
  }

  await persistStandingsSnapshot({
    ...identity,
    standingsTable: resolved.standings,
    sfvLeagueId: resolved.sfvLeagueId,
    sfvDivisionId: resolved.sfvDivisionId,
    sfvGroupId: resolved.sfvGroupId,
    fetchedAt,
  });
}

function competitionHintFromScheduleEvidence(
  evidence: StandingsScheduleEvidence,
): StandingsTableCompetitionHint | null {
  if (!evidence.dominantTuple) {
    return null;
  }

  return {
    providerDivisionId: evidence.dominantTuple.providerDivisionId,
    providerGroupId: evidence.dominantTuple.providerGroupId,
  };
}

function logStandingsStaleVsSchedule(
  input: FetchTeamStandingsInput,
  evidence: StandingsScheduleEvidence,
  evaluation: StandingsScheduleEvidenceEvaluation,
  integrity: { standingsPlayed: number | null },
  snapshotPlayed: number | null,
): void {
  const tuple = evaluation.competitionIdentity;

  console.warn(
    JSON.stringify({
      event: "SFV_STANDINGS_STALE_VS_SCHEDULE",
      tenantId: input.tenantId,
      teamSeasonId: input.teamSeasonId ?? null,
      externalTeamId: input.externalTeamId,
      externalSeasonId: input.externalSeasonId,
      providerLeagueId: input.providerLeagueId ?? null,
      providerDivisionId: tuple.providerDivisionId,
      providerGroupId: tuple.providerGroupId,
      standingsPlayed: integrity.standingsPlayed,
      completedRelevantMatches: evaluation.completedRelevantMatches,
      evidenceConfidence: evaluation.confidence,
      nonAuthoritativeReason: evaluation.nonAuthoritativeReason,
      snapshotPlayed,
    }),
  );
}

function logStandingsEvidenceIncomplete(
  input: FetchTeamStandingsInput,
  evaluation: StandingsScheduleEvidenceEvaluation,
  standingsPlayed: number | null,
): void {
  if (
    evaluation.confidence === "COMPLETE" ||
    standingsPlayed == null ||
    evaluation.completedRelevantMatches <= standingsPlayed
  ) {
    return;
  }

  console.warn(
    JSON.stringify({
      event: "SFV_STANDINGS_EVIDENCE_INCOMPLETE",
      tenantId: input.tenantId,
      teamSeasonId: input.teamSeasonId ?? null,
      externalTeamId: input.externalTeamId,
      externalSeasonId: input.externalSeasonId,
      providerLeagueId: input.providerLeagueId ?? null,
      providerDivisionId: evaluation.competitionIdentity.providerDivisionId,
      providerGroupId: evaluation.competitionIdentity.providerGroupId,
      standingsPlayed,
      completedRelevantMatches: evaluation.completedRelevantMatches,
      evidenceConfidence: evaluation.confidence,
      nonAuthoritativeReason: evaluation.nonAuthoritativeReason,
    }),
  );
}

function enrichDominantTupleWithResolvedGroup(
  evidence: StandingsScheduleEvidence,
  sfvGroupId: number,
): StandingsScheduleEvidence {
  if (!evidence.dominantTuple) {
    return evidence;
  }

  return {
    ...evidence,
    dominantTuple: {
      ...evidence.dominantTuple,
      providerGroupId:
        sfvGroupId > 0 ? sfvGroupId : evidence.dominantTuple.providerGroupId,
    },
  };
}

function buildScheduleEvidenceEvaluation(
  evidence: StandingsScheduleEvidence,
  authoritativeGroupId: number | null | undefined,
): StandingsScheduleEvidenceEvaluation | null {
  if (!evidence.dominantTuple) {
    return null;
  }

  return evaluateStandingsScheduleEvidence(
    evidence.relevantMatches,
    evidence.dominantTuple,
    { authoritativeGroupId },
  );
}

function buildRankingBaseParams(
  input: FetchTeamStandingsInput,
  config: Awaited<ReturnType<typeof requireEnabledSfvConfigForTenant>>,
): ClubRankingParams {
  return {
    SeasonId: input.externalSeasonId,
    ClubId: config.clubId,
    ...(config.organisationId !== null
      ? { OrganisationId: config.organisationId }
      : {}),
  };
}

async function resolveRankingTable(
  input: FetchTeamStandingsInput,
  entries: readonly ClubRankingEntry[],
  competitionHint: StandingsTableCompetitionHint | null,
): Promise<ResolvedStandingsTable | null> {
  return resolveStandingsTableWithIdentity({
    entries,
    externalTeamId: input.externalTeamId,
    providerLeagueId: input.providerLeagueId,
    competitionHint,
  });
}

type RankingsResolutionOutcome = {
  resolved: ResolvedStandingsTable;
  entries: ClubRankingEntry[];
  integrity: ReturnType<typeof evaluateStandingsStaleVsSchedule>;
  evidence: StandingsScheduleEvidence;
  evaluation: StandingsScheduleEvidenceEvaluation;
};

async function resolveWithScheduleIntegrity(
  input: FetchTeamStandingsInput,
  entries: ClubRankingEntry[],
  evidence: StandingsScheduleEvidence,
  competitionHint: StandingsTableCompetitionHint | null,
): Promise<RankingsResolutionOutcome | null> {
  const resolved = await resolveRankingTable(input, entries, competitionHint);
  if (!resolved) {
    return null;
  }

  const enrichedEvidence = enrichDominantTupleWithResolvedGroup(
    evidence,
    resolved.sfvGroupId,
  );

  const evaluation =
    buildScheduleEvidenceEvaluation(enrichedEvidence, resolved.sfvGroupId) ??
    ({
      completedRelevantMatches: 0,
      confidence: "INSUFFICIENT",
      dominantProviderMatchType: null,
      competitionIdentity: enrichedEvidence.dominantTuple ?? {
        providerLeagueId: resolved.sfvLeagueId,
        providerDivisionId: resolved.sfvDivisionId,
        providerGroupId:
          resolved.sfvGroupId > 0 ? resolved.sfvGroupId : null,
      },
      nonAuthoritativeReason: "MISSING_PROVIDER_MATCH_TYPE",
    } satisfies StandingsScheduleEvidenceEvaluation);

  const integrity = evaluateStandingsStaleVsSchedule({
    externalTeamId: input.externalTeamId,
    standingsTable: resolved.standings,
    completedRelevantMatches: evaluation.completedRelevantMatches,
    hasScheduleEvidence: enrichedEvidence.hasScheduleEvidence,
    evidenceConfidence: evaluation.confidence,
  });

  logStandingsEvidenceIncomplete(
    input,
    evaluation,
    integrity.standingsPlayed,
  );

  return {
    resolved,
    entries,
    integrity,
    evidence: enrichedEvidence,
    evaluation,
  };
}

async function tryFilteredRankingRetry(
  input: FetchTeamStandingsInput,
  config: Awaited<ReturnType<typeof requireEnabledSfvConfigForTenant>>,
  evidence: StandingsScheduleEvidence,
): Promise<ClubRankingEntry[] | null> {
  if (!evidence.dominantTuple) {
    return null;
  }

  const params = buildFilteredRankingParams(
    buildRankingBaseParams(input, config),
    evidence.dominantTuple,
    input.externalTeamId,
  );

  return fetchClubRanking(params);
}

async function finalizeStandingsResult(
  input: FetchTeamStandingsInput,
  outcome: RankingsResolutionOutcome,
  existingSnapshot: LoadedStandingsSnapshot | null,
): Promise<SportingStandingsTable> {
  const snapshotPlayed = existingSnapshot
    ? findOwnStandingsRowPlayed(
        existingSnapshot.standingsTable,
        input.externalTeamId,
      )
    : null;

  if (outcome.integrity.isStale) {
    logStandingsStaleVsSchedule(
      input,
      outcome.evidence,
      outcome.evaluation,
      outcome.integrity,
      snapshotPlayed,
    );
  }

  const incomingPlayed = outcome.integrity.standingsPlayed;
  const shouldPersist = shouldPersistStandingsSnapshot({
    incomingPlayed,
    existingSnapshotPlayed: snapshotPlayed,
    isStale: outcome.integrity.isStale,
    hasScheduleEvidence: hasAuthoritativeStandingsScheduleEvidence(
      outcome.evaluation,
    ),
  });

  if (shouldPersist) {
    await persistSuccessfulStandingsSnapshot(
      input,
      outcome.resolved,
      new Date(),
    );
    return outcome.resolved.standings;
  }

  if (
    existingSnapshot &&
    snapshotPlayed != null &&
    incomingPlayed != null &&
    snapshotPlayed > incomingPlayed
  ) {
    return existingSnapshot.standingsTable;
  }

  return outcome.resolved.standings;
}

/**
 * Fetches the authoritative standings table for a mapped SFV team.
 *
 * ClubId is always resolved from tenant configuration — never caller-supplied.
 * On transient provider failure, returns the durable last-known-good snapshot
 * when one exists. Returns null when no snapshot exists and fetch/resolution fails.
 */
export async function fetchTeamStandingsForMapping(
  input: FetchTeamStandingsInput,
): Promise<SportingStandingsTable | null> {
  if (
    !Number.isInteger(input.externalTeamId) ||
    input.externalTeamId <= 0 ||
    !Number.isInteger(input.externalSeasonId) ||
    input.externalSeasonId <= 0
  ) {
    return null;
  }

  const enabled = await isSfvEnabledForTenant(input.tenantId);
  if (!enabled) {
    return null;
  }

  const snapshotIdentity = buildSnapshotIdentity(input);
  const existingSnapshot = snapshotIdentity
    ? await loadStandingsSnapshot(snapshotIdentity)
    : null;

  try {
    const config = await requireEnabledSfvConfigForTenant(input.tenantId);

    const scheduleEvidence = await loadStandingsScheduleEvidence({
      tenantId: input.tenantId,
      externalTeamId: input.externalTeamId,
      externalSeasonId: input.externalSeasonId,
      providerLeagueId: input.providerLeagueId,
    });

    const competitionHint = competitionHintFromScheduleEvidence(scheduleEvidence);

    const cacheKey = buildStandingsCacheKey(input.tenantId, input.externalSeasonId);

    let entries = await fetchRankingEntriesWithInflightDedup(cacheKey, () =>
      fetchClubRanking(buildRankingBaseParams(input, config)),
    );

    let outcome = await resolveWithScheduleIntegrity(
      input,
      entries,
      scheduleEvidence,
      competitionHint,
    );

    if (
      outcome?.integrity.isStale &&
      hasAuthoritativeStandingsScheduleEvidence(outcome.evaluation) &&
      scheduleEvidence.dominantTuple != null
    ) {
      const filteredEntries = await tryFilteredRankingRetry(
        input,
        config,
        scheduleEvidence,
      );
      if (filteredEntries && filteredEntries.length > 0) {
        entries = filteredEntries;
        outcome = await resolveWithScheduleIntegrity(
          input,
          entries,
          scheduleEvidence,
          competitionHint,
        );
      }
    }

    if (!outcome) {
      console.warn(
        JSON.stringify({
          event: "SFV_STANDINGS_RESOLUTION_EMPTY",
          tenantId: input.tenantId,
          teamSeasonId: input.teamSeasonId ?? null,
          externalTeamId: input.externalTeamId,
          externalSeasonId: input.externalSeasonId,
          providerLeagueId: input.providerLeagueId ?? null,
          rankingEntryCount: entries.length,
          externalTeamIdPresent: entries.some(
            (entry) => entry.teamId === input.externalTeamId,
          ),
        }),
      );
      if (existingSnapshot) {
        logStandingsSnapshotFallback(input, existingSnapshot, {
          kind: "empty_or_unusable",
        });
        return existingSnapshot.standingsTable;
      }

      return await tryLoadSnapshotFallback(
        input,
        {
          kind: "empty_or_unusable",
        },
        existingSnapshot,
      );
    }

    return finalizeStandingsResult(input, outcome, existingSnapshot);
  } catch (error) {
    logStandingsProviderFailure(input, error);
    if (existingSnapshot) {
      logStandingsSnapshotFallback(input, existingSnapshot, {
        kind: "provider_failure",
        error,
      });
      return existingSnapshot.standingsTable;
    }

    return await tryLoadSnapshotFallback(
      input,
      {
        kind: "provider_failure",
        error,
      },
      existingSnapshot,
    );
  }
}
