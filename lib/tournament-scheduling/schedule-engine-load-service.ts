/**
 * SCE-TOURNAMENT-PLANNER-01H — load tournament fixtures for scheduling engines (WHO + side sources).
 */

import { prisma } from "@/lib/db/prisma";
import { requireTournamentEvent } from "./internal/require-tournament";
import type { ScheduleOptimisationSideSource } from "./schedule-optimiser/types";
import type { TournamentScheduleOptimisationFixtureRef } from "./schedule-optimiser/types";

export type LoadedScheduleEngineFixture = TournamentScheduleOptimisationFixtureRef;

function mapSideSource(row: {
  side: "A" | "B";
  sourceType: "CONCRETE_PARTICIPANT" | "QUALIFICATION_REFERENCE";
  participantId: string | null;
  qualificationSource: {
    sourceType: "GROUP_RANK" | "WINNER_OF_FIXTURE" | "LOSER_OF_FIXTURE";
    sourceFixtureId: string | null;
    sourceGroupId: string | null;
  } | null;
}): ScheduleOptimisationSideSource {
  if (row.sourceType === "CONCRETE_PARTICIPANT") {
    return {
      side: row.side,
      sourceType: "CONCRETE_PARTICIPANT",
      participantId: row.participantId,
    };
  }
  const qual = row.qualificationSource;
  if (qual?.sourceType === "WINNER_OF_FIXTURE" || qual?.sourceType === "LOSER_OF_FIXTURE") {
    return {
      side: row.side,
      sourceType: "WINNER_OF_FIXTURE",
      participantId: null,
      sourceFixtureId: qual.sourceFixtureId,
    };
  }
  return {
    side: row.side,
    sourceType: "QUALIFICATION_REFERENCE",
    participantId: null,
    sourceGroupId: qual?.sourceGroupId ?? null,
  };
}

export async function listTournamentScheduleEngineFixtures(
  tenantId: string,
  tournamentId: string,
): Promise<LoadedScheduleEngineFixture[]> {
  await requireTournamentEvent(tenantId, tournamentId);

  const rows = await prisma.tournamentFixture.findMany({
    where: { tenantId, eventId: tournamentId },
    orderBy: [
      { stageKey: "asc" },
      { roundIndex: "asc" },
      { slotIndexInRound: "asc" },
      { id: "asc" },
    ],
    include: {
      sides: {
        orderBy: { side: "asc" },
        include: {
          qualificationSource: {
            select: {
              sourceType: true,
              sourceFixtureId: true,
              sourceGroupId: true,
            },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const sideSources =
      row.sides.length > 0
        ? row.sides.map((s) =>
            mapSideSource({
              side: s.side,
              sourceType: s.sourceType,
              participantId: s.participantId,
              qualificationSource: s.qualificationSource,
            }),
          )
        : undefined;

    const sideA = row.sideAParticipantId ?? `__UNRESOLVED__:${row.id}:A`;
    const sideB = row.sideBParticipantId ?? `__UNRESOLVED__:${row.id}:B`;
    return {
      fixtureId: row.id,
      stageKey: row.stageKey,
      tournamentGroupId: row.tournamentGroupId,
      roundIndex: row.roundIndex,
      slotIndexInRound: row.slotIndexInRound,
      sideAParticipantId: sideA,
      sideBParticipantId: sideB,
      sideSources,
    };
  });
}
