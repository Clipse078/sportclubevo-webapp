/**
 * SFV standings stale-vs-schedule integrity checks.
 */

import type { SportingStandingsTable } from "@/lib/sporting-data/standings-types";
import type { StandingsCompetitionTuple } from "./standings-competition-identity";

export type StandingsStaleVsScheduleInput = {
  externalTeamId: number;
  standingsTable: SportingStandingsTable;
  completedRelevantMatches: number;
  hasScheduleEvidence: boolean;
};

export type StandingsStaleVsScheduleResult = {
  isStale: boolean;
  standingsPlayed: number | null;
};

export function findOwnStandingsRowPlayed(
  standingsTable: SportingStandingsTable,
  externalTeamId: number,
): number | null {
  const row = standingsTable.rows.find(
    (entry) => entry.externalTeamId === externalTeamId,
  );
  return row?.played ?? null;
}

/**
 * Stale when schedule evidence shows more standings-counting completed provider
 * match identities than the resolved SFV row reports as played. Requires
 * reliable schedule evidence — without it, standings are not declared stale.
 */
export function evaluateStandingsStaleVsSchedule(
  input: StandingsStaleVsScheduleInput,
): StandingsStaleVsScheduleResult {
  const standingsPlayed = findOwnStandingsRowPlayed(
    input.standingsTable,
    input.externalTeamId,
  );

  if (!input.hasScheduleEvidence || standingsPlayed == null) {
    return { isStale: false, standingsPlayed };
  }

  const isStale = input.completedRelevantMatches > standingsPlayed;

  return { isStale, standingsPlayed };
}

export type StandingsSnapshotPersistDecisionInput = {
  incomingPlayed: number | null;
  existingSnapshotPlayed: number | null;
  isStale: boolean;
  hasScheduleEvidence: boolean;
};

/**
 * When incoming ranking is stale vs schedule, do not persist a regressive
 * snapshot (lower own-row played than the durable snapshot).
 */
export function shouldPersistStandingsSnapshot(
  input: StandingsSnapshotPersistDecisionInput,
): boolean {
  if (!input.isStale) {
    return true;
  }

  if (
    input.hasScheduleEvidence &&
    input.existingSnapshotPlayed != null &&
    input.incomingPlayed != null &&
    input.incomingPlayed < input.existingSnapshotPlayed
  ) {
    return false;
  }

  if (input.isStale) {
    return false;
  }

  return true;
}

export function buildFilteredRankingParams(
  base: {
    SeasonId: number;
    ClubId: number;
    OrganisationId?: number;
  },
  tuple: StandingsCompetitionTuple,
  externalTeamId: number,
): {
  SeasonId: number;
  ClubId: number;
  OrganisationId?: number;
  LeagueId: number;
  DivisionId: number;
  GroupeId?: number;
  TeamId: number;
} {
  return {
    ...base,
    LeagueId: tuple.providerLeagueId,
    DivisionId: tuple.providerDivisionId,
    ...(tuple.providerGroupId != null && tuple.providerGroupId > 0
      ? { GroupeId: tuple.providerGroupId }
      : {}),
    TeamId: externalTeamId,
  };
}
