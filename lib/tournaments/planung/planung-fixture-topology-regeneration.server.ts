/**
 * Regenerate canonical fixture WHO/topology when Home/Away changes meeting count (R7.4).
 */

import { prisma } from "@/lib/db/prisma";
import { generateTournamentFixturesForEvent } from "@/lib/tournament-scheduling/fixture-generation-service";
import { generateTournamentGroupFixturesForPhase } from "@/lib/tournament-scheduling/group-formation/group-formation-service";
import { requireTenantOrganisedTournament } from "@/lib/tournament-scheduling/internal/require-tenant-organised-tournament";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";
import { recordPlanungFixtureGeneratorInvocation } from "@/lib/tournaments/planung/planung-load-telemetry";
import {
  resolveEffectiveRoundRobinMeetingsPerOpponent,
  type PlanungFixtureHomeAwayRelevance,
} from "./planung-round-robin-home-away";

export async function regeneratePlanungFixtureTopologyForHomeAway(params: {
  tenantId: string;
  tournamentId: string;
  fixtureHomeAwayRelevance: PlanungFixtureHomeAwayRelevance;
}): Promise<{ fixtureCount: number }> {
  await requireTenantOrganisedTournament(params.tenantId, params.tournamentId);
  recordPlanungFixtureGeneratorInvocation();

  const competition = await prisma.tournamentCompetitionConfiguration.findFirst({
    where: { tenantId: params.tenantId, eventId: params.tournamentId },
    select: {
      roundRobinMeetingsPerOpponent: true,
      competitionFormat: true,
    },
  });
  if (!competition) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_GENERATION_INVALID",
      "Turnierkonfiguration fehlt — Spielplan konnte nicht neu erstellt werden.",
    );
  }

  const storedMeetings = competition.roundRobinMeetingsPerOpponent ?? 1;
  const meetingsPerOpponent = resolveEffectiveRoundRobinMeetingsPerOpponent(
    storedMeetings,
    params.fixtureHomeAwayRelevance,
  );
  const homeAwayRelevance = params.fixtureHomeAwayRelevance;

  await prisma.tournamentFixture.deleteMany({
    where: { tenantId: params.tenantId, eventId: params.tournamentId },
  });

  const groupPhases = await prisma.tournamentPhase.findMany({
    where: {
      tenantId: params.tenantId,
      eventId: params.tournamentId,
      phaseType: "GROUP_MIX",
    },
    select: {
      id: true,
      groupMixStrategy: true,
      smartMixTargetMatchesPerParticipant: true,
    },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });

  if (groupPhases.length === 0) {
    await generateTournamentFixturesForEvent(params.tenantId, params.tournamentId, {
      meetingsPerOpponent,
      homeAwayRelevance,
      strategy: "ROUND_ROBIN",
    });
  } else {
    for (const phase of groupPhases) {
      const groupCount = await prisma.tournamentGroup.count({
        where: {
          tenantId: params.tenantId,
          eventId: params.tournamentId,
          tournamentPhaseId: phase.id,
        },
      });
      const strategy = phase.groupMixStrategy ?? "ROUND_ROBIN";
      const targetMatchesPerParticipant =
        strategy === "SMART_MIX"
          ? (phase.smartMixTargetMatchesPerParticipant ?? undefined)
          : undefined;
      if (groupCount > 0) {
        await generateTournamentGroupFixturesForPhase(params.tenantId, {
          tournamentId: params.tournamentId,
          phaseId: phase.id,
          strategy,
          meetingsPerOpponent,
          targetMatchesPerParticipant,
          homeAwayRelevance,
        });
      } else {
        await generateTournamentFixturesForEvent(params.tenantId, params.tournamentId, {
          phaseId: phase.id,
          meetingsPerOpponent,
          homeAwayRelevance,
          strategy,
          targetMatchesPerParticipant,
        });
      }
    }
  }

  const fixtureCount = await prisma.tournamentFixture.count({
    where: { tenantId: params.tenantId, eventId: params.tournamentId },
  });

  return { fixtureCount };
}
