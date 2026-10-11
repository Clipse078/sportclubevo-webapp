/**
 * SCE-ACTIVITY-NAV-01 UAT R2 — Tournament Aufgebot context (Hauptteam / TeamSeason).
 * Reuses MatchSquad persistence keyed by Event.id; does not treat the Event as type MATCH.
 */

import type { TeamSeasonStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveTeamSeasonIdForTeamAndSeason } from "@/lib/planning/resolve-team-season-id";
import {
  MatchSquadNotFoundError,
  MatchSquadValidationError,
} from "@/lib/match-squad/errors";

export type ResolvedTournamentSquadEventContext = {
  eventId: string;
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  seasonId: string;
  status: string;
  title: string;
  teamSeasonStatus: TeamSeasonStatus;
  teamDisplayName: string | null;
};

/**
 * Resolves the manageable own-team squad context for a tournament using Event.teamId /
 * Event.teamSeasonId (Hauptteam — Teamseite / Wochenplan). Additional tenant teams listed
 * under Tournament Teilnahme do not receive separate squads until schema supports it.
 */
export async function resolveTournamentSquadEventContext(
  tenantId: string,
  eventId: string,
): Promise<ResolvedTournamentSquadEventContext> {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      tenantId,
      type: "TOURNAMENT",
    },
    select: {
      id: true,
      tenantId: true,
      teamId: true,
      teamSeasonId: true,
      seasonId: true,
      status: true,
      title: true,
      team: { select: { id: true, name: true } },
    },
  });

  if (!event || !event.tenantId) {
    throw new MatchSquadNotFoundError();
  }

  const teamId = event.teamId?.trim();
  if (!teamId) {
    throw new MatchSquadValidationError(
      "Für dieses Turnier ist kein Hauptteam zugeordnet — Aufgebot nicht möglich.",
      "NO_OWN_TEAM",
    );
  }

  const seasonId = event.seasonId?.trim();
  if (!seasonId) {
    throw new MatchSquadValidationError(
      "Für dieses Turnier ist keine Saison hinterlegt — Aufgebot nicht möglich.",
      "NO_SEASON",
    );
  }

  let teamSeasonId = event.teamSeasonId?.trim() ?? null;
  if (!teamSeasonId) {
    teamSeasonId = await resolveTeamSeasonIdForTeamAndSeason(tenantId, teamId, seasonId);
  }

  if (!teamSeasonId) {
    throw new MatchSquadValidationError(
      "Team-Saison für dieses Turnier konnte nicht aufgelöst werden.",
      "NO_TEAM_SEASON",
    );
  }

  const teamSeason = await prisma.teamSeason.findFirst({
    where: {
      id: teamSeasonId,
      teamId,
      seasonId,
      team: { tenantId },
    },
    select: {
      id: true,
      status: true,
      displayName: true,
      teamId: true,
    },
  });

  if (!teamSeason) {
    throw new MatchSquadValidationError(
      "Team-Saison passt nicht zum Turnier — Aufgebot nicht möglich.",
      "TEAM_SEASON_MISMATCH",
    );
  }

  if (teamSeason.status !== "ACTIVE") {
    throw new MatchSquadValidationError(
      "Die Team-Saison ist nicht aktiv — Aufgebot kann nicht bearbeitet werden.",
      "TEAM_SEASON_INACTIVE",
    );
  }

  return {
    eventId: event.id,
    tenantId: event.tenantId,
    teamId,
    teamSeasonId: teamSeason.id,
    seasonId,
    status: event.status,
    title: event.title,
    teamSeasonStatus: teamSeason.status,
    teamDisplayName: teamSeason.displayName,
  };
}
