/**
 * Detect stale round-robin fixture topology vs persisted Home/Away intent (R7.7).
 */

import { prisma } from "@/lib/db/prisma";
import {
  expectedRoundRobinFixtureCount,
  expectedRoundRobinGlobalRoundCount,
} from "@/lib/tournament-scheduling/fixtures/round-robin";
import { resolveEffectiveRoundRobinMeetingsPerOpponent } from "./planung-round-robin-home-away";

export type PlanungRoundRobinTopologyAssessment = {
  applicable: boolean;
  mismatch: boolean;
  participantCount: number;
  fixtureHomeAwayRelevance: "ON" | "OFF";
  storedMeetingsPerOpponent: number;
  effectiveMeetingsPerOpponent: number;
  expectedFixtureCount: number;
  actualFixtureCount: number;
  expectedCompetitionRoundCount: number;
};

export async function assessPlanungRoundRobinTopologyMismatch(params: {
  tenantId: string;
  tournamentId: string;
}): Promise<PlanungRoundRobinTopologyAssessment> {
  const [participantCount, actualFixtureCount, competition, knockoutFixtureCount, groupCount] =
    await Promise.all([
      prisma.tournamentParticipant.count({
        where: { tenantId: params.tenantId, eventId: params.tournamentId },
      }),
      prisma.tournamentFixture.count({
        where: { tenantId: params.tenantId, eventId: params.tournamentId },
      }),
      prisma.tournamentCompetitionConfiguration.findFirst({
        where: { tenantId: params.tenantId, eventId: params.tournamentId },
        select: {
          fixtureHomeAwayRelevance: true,
          roundRobinMeetingsPerOpponent: true,
          competitionFormat: true,
        },
      }),
      prisma.tournamentFixture.count({
        where: {
          tenantId: params.tenantId,
          eventId: params.tournamentId,
          phase: { phaseType: "KNOCKOUT" },
        },
      }),
      prisma.tournamentGroup.count({
        where: { tenantId: params.tenantId, eventId: params.tournamentId },
      }),
    ]);

  const fixtureHomeAwayRelevance =
    competition?.fixtureHomeAwayRelevance === "ON" ? "ON" : "OFF";
  const storedMeetingsPerOpponent = competition?.roundRobinMeetingsPerOpponent ?? 1;
  const effectiveMeetingsPerOpponent = resolveEffectiveRoundRobinMeetingsPerOpponent(
    storedMeetingsPerOpponent,
    fixtureHomeAwayRelevance,
  );

  const applicable =
    participantCount >= 2 &&
    knockoutFixtureCount === 0 &&
    groupCount <= 1 &&
    (competition?.competitionFormat == null ||
      competition.competitionFormat === "GROUP_MIX_ONLY");

  const expectedFixtureCount = applicable
    ? expectedRoundRobinFixtureCount(participantCount, effectiveMeetingsPerOpponent)
    : actualFixtureCount;
  const expectedCompetitionRoundCount = applicable
    ? expectedRoundRobinGlobalRoundCount(participantCount, effectiveMeetingsPerOpponent)
    : 0;

  const mismatch = applicable && actualFixtureCount !== expectedFixtureCount;

  return {
    applicable,
    mismatch,
    participantCount,
    fixtureHomeAwayRelevance,
    storedMeetingsPerOpponent,
    effectiveMeetingsPerOpponent,
    expectedFixtureCount,
    actualFixtureCount,
    expectedCompetitionRoundCount,
  };
}

export async function ensurePersistedRoundRobinMeetingsForHomeAwayRelevance(params: {
  tenantId: string;
  tournamentId: string;
  fixtureHomeAwayRelevance: "ON" | "OFF";
}): Promise<void> {
  const competition = await prisma.tournamentCompetitionConfiguration.findFirst({
    where: { tenantId: params.tenantId, eventId: params.tournamentId },
    select: { roundRobinMeetingsPerOpponent: true },
  });
  const stored = competition?.roundRobinMeetingsPerOpponent ?? 1;
  if (params.fixtureHomeAwayRelevance === "ON" && stored === 1) {
    await prisma.tournamentCompetitionConfiguration.updateMany({
      where: { tenantId: params.tenantId, eventId: params.tournamentId },
      data: { roundRobinMeetingsPerOpponent: 2 },
    });
  }
}
