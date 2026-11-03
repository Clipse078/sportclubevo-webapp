/**
 * Completed league-match evidence for SFV standings integrity and tuple identity.
 */

import { prisma } from "@/lib/db/prisma";
import { getMatchcenterLifecycleStage } from "@/lib/matchcenter/match-lifecycle";
import { SFV_PROVIDER } from "./season-bridge";
import {
  countMatchEvidenceForCompetitionTuple,
  deriveDominantCompetitionTupleFromMatchEvidence,
  type StandingsCompetitionTuple,
  type StandingsScheduleMatchEvidence,
} from "./standings-competition-identity";

export type LoadStandingsScheduleEvidenceInput = {
  tenantId: string;
  externalTeamId: number;
  externalSeasonId: number;
  providerLeagueId?: number | null;
  now?: Date;
};

export type StandingsScheduleEvidence = {
  /** Completed league matches used as evidence (already filtered). */
  relevantMatches: StandingsScheduleMatchEvidence[];
  dominantTuple: StandingsCompetitionTuple | null;
  completedRelevantMatches: number;
  hasScheduleEvidence: boolean;
};

function isCompletedLeagueMatch(
  event: {
    status: string;
    startAt: Date;
  },
  mapping: {
    providerMatchStateName: string | null;
  },
  now: Date,
): boolean {
  const stage = getMatchcenterLifecycleStage(
    {
      status: event.status,
      startAt: event.startAt,
      synchronization: {
        providerMatchStateName: mapping.providerMatchStateName,
      },
    },
    now,
  );
  return stage === "COMPLETED";
}

export async function loadStandingsScheduleEvidence(
  input: LoadStandingsScheduleEvidenceInput,
): Promise<StandingsScheduleEvidence> {
  const now = input.now ?? new Date();

  const rows = await prisma.matchExternalMapping.findMany({
    where: {
      tenantId: input.tenantId,
      provider: SFV_PROVIDER,
      externalSeasonId: input.externalSeasonId,
      OR: [
        { providerHomeTeamId: input.externalTeamId },
        { providerAwayTeamId: input.externalTeamId },
      ],
      event: {
        type: "MATCH",
      },
    },
    select: {
      providerLeagueId: true,
      providerDivisionId: true,
      providerMatchStateName: true,
      event: {
        select: {
          status: true,
          startAt: true,
        },
      },
    },
  });

  const relevantMatches: StandingsScheduleMatchEvidence[] = [];

  for (const row of rows) {
    if (!isCompletedLeagueMatch(row.event, row, now)) {
      continue;
    }

    if (
      input.providerLeagueId != null &&
      Number.isInteger(input.providerLeagueId) &&
      input.providerLeagueId > 0 &&
      row.providerLeagueId !== input.providerLeagueId
    ) {
      continue;
    }

    relevantMatches.push({
      providerLeagueId: row.providerLeagueId,
      providerDivisionId: row.providerDivisionId,
    });
  }

  const dominantTuple = deriveDominantCompetitionTupleFromMatchEvidence(
    relevantMatches,
    { providerLeagueId: input.providerLeagueId },
  );

  const completedRelevantMatches =
    dominantTuple != null
      ? countMatchEvidenceForCompetitionTuple(
          relevantMatches,
          dominantTuple,
          true,
        )
      : 0;

  return {
    relevantMatches,
    dominantTuple,
    completedRelevantMatches,
    hasScheduleEvidence: dominantTuple != null && completedRelevantMatches > 0,
  };
}
