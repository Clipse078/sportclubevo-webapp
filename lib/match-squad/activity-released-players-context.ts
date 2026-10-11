/**
 * Shared target-activity context for MATCH / TOURNAMENT released-player discovery (01D).
 */

import { prisma } from "@/lib/db/prisma";
import { resolveMatchSquadEventContext } from "@/lib/match-squad/event-context";
import { resolveTournamentSquadEventContext } from "@/lib/match-squad/tournament-squad-event-context";
import { PlayerReleaseRequestValidationError } from "@/lib/match-squad/player-release-request-errors";

export type ActivityReleasedPlayersContext = {
  tenantId: string;
  targetEventId: string;
  targetEventType: "MATCH" | "TOURNAMENT";
  targetTeamSeasonId: string;
  teamId: string;
  targetActivityStartAt: Date;
  targetEndAt: Date | null;
  eventTitle: string;
};

export async function resolveMatchReleasedPlayersContext(
  tenantId: string,
  matchId: string,
): Promise<ActivityReleasedPlayersContext> {
  const ctx = await resolveMatchSquadEventContext(tenantId, matchId);
  const event = await prisma.event.findFirst({
    where: { id: matchId, tenantId, type: "MATCH" },
    select: { startAt: true, endAt: true, title: true },
  });
  if (!event) {
    throw new PlayerReleaseRequestValidationError("Spiel nicht gefunden.", "NOT_FOUND");
  }
  return {
    tenantId,
    targetEventId: ctx.eventId,
    targetEventType: "MATCH",
    targetTeamSeasonId: ctx.teamSeasonId,
    teamId: ctx.teamId,
    targetActivityStartAt: event.startAt,
    targetEndAt: event.endAt,
    eventTitle: event.title,
  };
}

export async function resolveTournamentReleasedPlayersContext(
  tenantId: string,
  tournamentId: string,
): Promise<ActivityReleasedPlayersContext> {
  const ctx = await resolveTournamentSquadEventContext(tenantId, tournamentId);
  const event = await prisma.event.findFirst({
    where: { id: tournamentId, tenantId, type: "TOURNAMENT" },
    select: { startAt: true, endAt: true, title: true },
  });
  if (!event) {
    throw new PlayerReleaseRequestValidationError("Turnier nicht gefunden.", "NOT_FOUND");
  }
  return {
    tenantId,
    targetEventId: ctx.eventId,
    targetEventType: "TOURNAMENT",
    targetTeamSeasonId: ctx.teamSeasonId,
    teamId: ctx.teamId,
    targetActivityStartAt: event.startAt,
    targetEndAt: event.endAt,
    eventTitle: event.title,
  };
}
