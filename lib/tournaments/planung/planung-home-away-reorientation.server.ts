/**
 * Re-orient persisted fixture sides when fixtureHomeAwayRelevance changes (WHO unchanged).
 */

import { prisma } from "@/lib/db/prisma";
import { canonicalizeParticipantIds } from "@/lib/tournament-scheduling/fixtures/ordering";
import { generateTournamentFixtures } from "@/lib/tournament-scheduling/fixtures/generate-tournament-fixtures";
import { listTournamentFixtures } from "@/lib/tournament-scheduling/fixture-service";
import { requireTenantOrganisedTournament } from "@/lib/tournament-scheduling/internal/require-tenant-organised-tournament";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";
import type { HomeAwayRelevance } from "@/lib/tournament-scheduling/smart-generator-architecture";

function fixtureSlotKey(input: {
  stageKey: string;
  roundIndex: number;
  slotIndexInRound: number;
}): string {
  return `${input.stageKey}|${input.roundIndex}|${input.slotIndexInRound}`;
}

export async function reorientPlanungFixtureSidesForHomeAway(params: {
  tenantId: string;
  tournamentId: string;
  fixtureHomeAwayRelevance: HomeAwayRelevance;
}): Promise<{ updatedFixtures: number }> {
  await requireTenantOrganisedTournament(params.tenantId, params.tournamentId);

  const [competition, participantRows, phases, existing] = await Promise.all([
    prisma.tournamentCompetitionConfiguration.findFirst({
      where: { tenantId: params.tenantId, eventId: params.tournamentId },
      select: {
        competitionFormat: true,
        roundRobinMeetingsPerOpponent: true,
      },
    }),
    prisma.tournamentParticipant.findMany({
      where: { tenantId: params.tenantId, eventId: params.tournamentId },
      select: { id: true, displayOrder: true },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    }),
    prisma.tournamentPhase.findMany({
      where: { tenantId: params.tenantId, eventId: params.tournamentId },
      select: {
        stageKey: true,
        groupMixStrategy: true,
        smartMixTargetMatchesPerParticipant: true,
      },
    }),
    listTournamentFixtures(params.tenantId, params.tournamentId),
  ]);

  if (existing.length === 0) {
    return { updatedFixtures: 0 };
  }

  const canonicalIds = canonicalizeParticipantIds(participantRows);
  const phaseByStage = new Map(phases.map((p) => [p.stageKey, p]));
  const stageKeys = [...new Set(existing.map((f) => f.stageKey))];

  const generatedBySlot = new Map<
    string,
    { sideAParticipantId: string; sideBParticipantId: string }
  >();

  for (const stageKey of stageKeys) {
    const phase = phaseByStage.get(stageKey);
    const fixturesInStage = existing.filter((f) => f.stageKey === stageKey);
    const strategy = phase?.groupMixStrategy ?? "ROUND_ROBIN";

    let generated;
    if (strategy === "SMART_MIX") {
      const target = phase?.smartMixTargetMatchesPerParticipant;
      if (target == null) {
        throw new TournamentSchedulingError(
          "TOURNAMENT_GENERATION_INVALID",
          "Smart-Mix-Konfiguration fehlt — Heim/Auswärts konnte nicht angewendet werden.",
        );
      }
      generated = generateTournamentFixtures({
        strategy: "SMART_MIX",
        participantIds: canonicalIds,
        smartMix: {
          stageKey,
          targetMatchesPerParticipant: target,
          homeAwayRelevance: params.fixtureHomeAwayRelevance,
        },
      });
    } else {
      generated = generateTournamentFixtures({
        strategy: "ROUND_ROBIN",
        participantIds: canonicalIds,
        roundRobin: {
          format: "ROUND_ROBIN",
          stageKey,
          meetingsPerOpponent: competition?.roundRobinMeetingsPerOpponent ?? 1,
          homeAwayRelevance: params.fixtureHomeAwayRelevance,
        },
      });
    }

    const stageSlotSet = new Set(
      fixturesInStage.map((f) =>
        fixtureSlotKey({
          stageKey: f.stageKey,
          roundIndex: f.roundIndex,
          slotIndexInRound: f.slotIndexInRound,
        }),
      ),
    );

    for (const definition of generated) {
      const key = fixtureSlotKey(definition);
      if (stageSlotSet.has(key)) {
        generatedBySlot.set(key, {
          sideAParticipantId: definition.sideAParticipantId,
          sideBParticipantId: definition.sideBParticipantId,
        });
      }
    }
  }

  let updatedFixtures = 0;
  await prisma.$transaction(async (tx) => {
    for (const fixture of existing) {
      if (!fixture.sideAParticipantId || !fixture.sideBParticipantId) continue;
      const key = fixtureSlotKey(fixture);
      const target = generatedBySlot.get(key);
      if (!target) continue;
      if (
        target.sideAParticipantId === fixture.sideAParticipantId &&
        target.sideBParticipantId === fixture.sideBParticipantId
      ) {
        continue;
      }

      await tx.tournamentFixture.update({
        where: { id: fixture.id, tenantId: params.tenantId },
        data: {
          sideAParticipantId: target.sideAParticipantId,
          sideBParticipantId: target.sideBParticipantId,
        },
      });

      await tx.tournamentFixtureSide.updateMany({
        where: { tenantId: params.tenantId, fixtureId: fixture.id, side: "A" },
        data: { participantId: target.sideAParticipantId },
      });
      await tx.tournamentFixtureSide.updateMany({
        where: { tenantId: params.tenantId, fixtureId: fixture.id, side: "B" },
        data: { participantId: target.sideBParticipantId },
      });
      updatedFixtures += 1;
    }
  });

  return { updatedFixtures };
}
