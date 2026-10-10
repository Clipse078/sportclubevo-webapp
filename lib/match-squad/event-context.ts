/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01A — canonical MATCH → own-team TeamSeason resolution.
 */

import type { TeamSeasonStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveTeamSeasonIdForTeamAndSeason } from "@/lib/planning/resolve-team-season-id";
import {
  loadTeamSeasonIdByTeamAndSeasonForMatches,
  resolveMatchcenterOwnTeamId,
  resolveWeekplannerMatchTeamSeasonId,
} from "@/lib/weekplanner/match-team-season-resolution";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import {
  MatchSquadNotFoundError,
  MatchSquadValidationError,
} from "@/lib/match-squad/errors";

export type ResolvedMatchSquadEventContext = {
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

function buildMinimalMatchSummary(input: {
  id: string;
  tenantId: string;
  teamId: string | null;
  teamSeasonId: string | null;
  seasonId: string | null;
  title: string;
  homeAway: string | null;
  team: { id: string; name: string } | null;
  matchExternalMapping: {
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeTeam: { id: string; name: string } | null;
    awayTeam: { id: string; name: string } | null;
  } | null;
}): MatchcenterMatchSummary {
  const mapping = input.matchExternalMapping;
  const homeCanonical = mapping?.homeTeam ?? null;
  const awayCanonical = mapping?.awayTeam ?? null;
  const homeAway = input.homeAway?.trim().toUpperCase() ?? null;
  const ownTeamIsAway = homeAway === "AWAY";

  return {
    id: input.id,
    tenantId: input.tenantId,
    teamId: input.teamId,
    teamSeasonId: input.teamSeasonId,
    seasonId: input.seasonId,
    type: "MATCH",
    title: input.title,
    description: null,
    status: "SCHEDULED",
    startAt: new Date(),
    kickoffKnown: true,
    endAt: null,
    operationalEndAtOverride: null,
    operationalEndAt: new Date(),
    location: null,
    competitionLabel: null,
    homeAway: input.homeAway,
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: {
      providerTeamId: null,
      providerTeamName: null,
      canonicalTeamId: ownTeamIsAway ? awayCanonical?.id ?? null : input.team?.id ?? homeCanonical?.id ?? null,
      canonicalTeamName: ownTeamIsAway ? awayCanonical?.name ?? null : input.team?.name ?? homeCanonical?.name ?? null,
      displayName: "",
      resolution: "RESOLVED",
      isOwnTeam: !ownTeamIsAway,
    },
    away: {
      providerTeamId: null,
      providerTeamName: null,
      canonicalTeamId: ownTeamIsAway ? input.team?.id ?? awayCanonical?.id ?? null : awayCanonical?.id ?? null,
      canonicalTeamName: ownTeamIsAway ? input.team?.name ?? awayCanonical?.name ?? null : awayCanonical?.name ?? null,
      displayName: "",
      resolution: "RESOLVED",
      isOwnTeam: ownTeamIsAway,
    },
    source: {
      eventSource: "MANUAL",
      externalSource: null,
      externalSourceId: null,
      provider: null,
      externalMatchId: null,
      externalSeasonId: null,
      matchNumber: null,
    },
    synchronization: {
      eventLastSyncedAt: null,
      mappingLastSyncedAt: null,
      detailSyncedAt: null,
      providerMatchState: null,
      providerMatchStateName: null,
    },
    operational: {
      pitchCode: null,
      homeDressingRoomCode: null,
      awayDressingRoomCode: null,
      meetingTime: null,
      remarks: null,
    },
    visibility: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
      trainingsplanVisible: false,
      teamPageVisible: false,
    },
    reviewStage: "DRAFT",
    publishedAt: null,
    participationResponseDueAt: null,
    participationReminder1At: null,
    participationReminder2At: null,
    participationReminder1PresetKey: null,
    participationReminder2PresetKey: null,
  };
}

export async function resolveMatchSquadEventContext(
  tenantId: string,
  eventId: string,
): Promise<ResolvedMatchSquadEventContext> {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      tenantId,
      type: "MATCH",
    },
    select: {
      id: true,
      tenantId: true,
      teamId: true,
      teamSeasonId: true,
      seasonId: true,
      status: true,
      title: true,
      homeAway: true,
      team: { select: { id: true, name: true } },
      matchExternalMapping: {
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!event || !event.tenantId) {
    throw new MatchSquadNotFoundError();
  }

  const summary = buildMinimalMatchSummary({
    ...event,
    tenantId: event.tenantId,
  });

  const ownTeamId = resolveMatchcenterOwnTeamId(summary);
  if (!ownTeamId) {
    throw new MatchSquadValidationError(
      "Für dieses Spiel ist kein eigenes Team zugeordnet — Aufgebot nicht möglich.",
      "NO_OWN_TEAM",
    );
  }

  const seasonId = event.seasonId?.trim();
  if (!seasonId) {
    throw new MatchSquadValidationError(
      "Für dieses Spiel ist keine Saison hinterlegt — Aufgebot nicht möglich.",
      "NO_SEASON",
    );
  }

  let teamSeasonId = event.teamSeasonId?.trim() ?? null;
  if (!teamSeasonId) {
    const lookup = await loadTeamSeasonIdByTeamAndSeasonForMatches(tenantId, [summary]);
    teamSeasonId = resolveWeekplannerMatchTeamSeasonId(summary, lookup);
  }
  if (!teamSeasonId) {
    teamSeasonId = await resolveTeamSeasonIdForTeamAndSeason(tenantId, ownTeamId, seasonId);
  }

  if (!teamSeasonId) {
    throw new MatchSquadValidationError(
      "Team-Saison für dieses Spiel konnte nicht aufgelöst werden.",
      "NO_TEAM_SEASON",
    );
  }

  const teamSeason = await prisma.teamSeason.findFirst({
    where: {
      id: teamSeasonId,
      teamId: ownTeamId,
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
      "Team-Saison passt nicht zum Spiel — Aufgebot nicht möglich.",
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
    teamId: ownTeamId,
    teamSeasonId: teamSeason.id,
    seasonId,
    status: event.status,
    title: event.title,
    teamSeasonStatus: teamSeason.status,
    teamDisplayName: teamSeason.displayName,
  };
}
