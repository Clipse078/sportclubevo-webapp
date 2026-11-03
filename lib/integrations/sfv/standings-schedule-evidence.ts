/**
 * Completed league-match evidence for SFV standings integrity and tuple identity.
 */

import { prisma } from "@/lib/db/prisma";
import { getMatchcenterLifecycleStage } from "@/lib/matchcenter/match-lifecycle";
import { SFV_PROVIDER } from "./season-bridge";
import {
  countMatchEvidenceForCompetitionTuple,
  deriveCurrentCompetitionTupleFromMatchEvidence,
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
  /** League matches used as schedule evidence (completed + upcoming). */
  relevantMatches: StandingsScheduleMatchEvidence[];
  dominantTuple: StandingsCompetitionTuple | null;
  completedRelevantMatches: number;
  hasScheduleEvidence: boolean;
};

function classifyMatchLifecycle(
  event: {
    status: string;
    startAt: Date;
  },
  mapping: {
    providerMatchStateName: string | null;
  },
  now: Date,
): "COMPLETED" | "UPCOMING" | "OTHER" {
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
  if (stage === "COMPLETED") {
    return "COMPLETED";
  }
  if (stage === "UPCOMING") {
    return "UPCOMING";
  }
  return "OTHER";
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
      providerRoundNbr: true,
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
    const lifecycle = classifyMatchLifecycle(row.event, row, now);
    if (lifecycle === "OTHER") {
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
      providerRoundNbr: row.providerRoundNbr,
      startAt: row.event.startAt,
      isCompleted: lifecycle === "COMPLETED",
      isUpcoming: lifecycle === "UPCOMING",
    });
  }

  const dominantTuple = deriveCurrentCompetitionTupleFromMatchEvidence(
    relevantMatches,
    { providerLeagueId: input.providerLeagueId },
  );

  const completedRelevantMatches =
    dominantTuple != null
      ? countMatchEvidenceForCompetitionTuple(
          relevantMatches,
          dominantTuple,
          true,
          { now },
        )
      : 0;

  return {
    relevantMatches,
    dominantTuple,
    completedRelevantMatches,
    hasScheduleEvidence: dominantTuple != null && completedRelevantMatches > 0,
  };
}
