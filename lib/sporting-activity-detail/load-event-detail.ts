import { prisma } from "@/lib/db/prisma";
import { batchGetEventAllocationDisplayForTenant } from "@/lib/facilities/display-helpers";
import { isPersonalTeamEventRowRelevant } from "@/lib/dashboard/personal-context";
import {
  canIncludeEventInPersonalProjection,
  type PersonalEventProjectionActor,
} from "@/lib/personal-agenda/event-projection-access";
import { programmeResourceKey } from "@/lib/personal-agenda/personal-programme-types";
import { normalizeEventProgrammeStatus } from "@/lib/personal-agenda/programme-status";
import {
  buildMatchActivityPresentation,
  buildTournamentActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";
import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design";
import { buildTournamentOrganiserClubIdentity } from "@/lib/sporting-activity-design/tournament-organiser-identity";
import { loadMatchEventPoliciesByEventId } from "@/lib/website/public-matches-identity";
import {
  getMatchcenterMatchDetail,
  type MatchcenterQueryDatabase,
} from "@/lib/matchcenter/query-service";
import { getTenantMatchOperationalPolicy } from "@/lib/match/tenant-operational-policy-service";
import { getTournament } from "@/lib/tournaments/tournament-service";
import { buildSportingActivityDetailParticipantTeam } from "./participant-team";
import { loadSportingActivityDetailParticipation } from "./participation";
import { resolveSportingActivityDetailRouteTarget } from "./route-target";
import type { LoadSportingActivityDetailResult, SportingActivityDetail } from "./types";

export async function loadMatchActivityDetail(input: {
  tenantId: string;
  userId: string;
  personId: string | null;
  permissionKeys: string[];
  personal: Awaited<ReturnType<typeof import("@/lib/dashboard/personal-context").resolvePersonalContext>>;
  eventId: string;
  tenantClubName: string;
  tenantLogoUrl: string | null;
}): Promise<LoadSportingActivityDetailResult> {
  const event = await prisma.event.findFirst({
    where: { id: input.eventId, tenantId: input.tenantId, type: "MATCH" },
    select: {
      id: true,
      tenantId: true,
      teamId: true,
      teamSeasonId: true,
      type: true,
      status: true,
      reviewStage: true,
      title: true,
      startAt: true,
      endAt: true,
      allDay: true,
      opponentName: true,
      homeAway: true,
      location: true,
      pitchCode: true,
      competitionLabel: true,
      meetingTime: true,
      description: true,
      team: { select: { name: true } },
    },
  });

  if (!event || !event.teamSeasonId) {
    return { ok: false, reason: "not_found" };
  }

  const actor: PersonalEventProjectionActor = {
    userId: input.userId,
    tenantId: input.tenantId,
    permissionKeys: input.permissionKeys,
  };

  if (!isPersonalTeamEventRowRelevant(input.personal, event)) {
    return { ok: false, reason: "forbidden" };
  }
  if (!canIncludeEventInPersonalProjection(actor, event)) {
    return { ok: false, reason: "forbidden" };
  }

  const [policyByEventId, allocationDisplays, matchOperationalPolicy] = await Promise.all([
    loadMatchEventPoliciesByEventId(input.tenantId, [event.id]),
    batchGetEventAllocationDisplayForTenant(
      [
        {
          type: event.type,
          pitchCode: event.pitchCode,
          homeDressingRoomCode: null,
          awayDressingRoomCode: null,
        },
      ],
      input.tenantId,
    ),
    getTenantMatchOperationalPolicy(input.tenantId),
  ]);

  const pitchLabel = allocationDisplays[0]?.pitchLabel ?? null;
  const teamName = event.team?.name ?? undefined;
  const resourceKey = programmeResourceKey("MATCH", event.id);
  const status = normalizeEventProgrammeStatus(event.status);

  const presentation = buildMatchActivityPresentation({
    resourceKey,
    title: event.title,
    typeLabel: "Spiel",
    teamName,
    opponentName: event.opponentName,
    homeAway: event.homeAway,
    location: event.location,
    pitchCode: event.pitchCode,
    pitchLabel,
    competitionLabel: event.competitionLabel,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
    status,
    policy: policyByEventId.get(event.id),
    tenantClubName: input.tenantClubName,
  });

  const matchcenterDatabase = prisma as unknown as MatchcenterQueryDatabase;
  const matchDetail = await getMatchcenterMatchDetail(matchcenterDatabase, {
    tenantId: input.tenantId,
    eventId: event.id,
    matchOperationalPolicy,
  });

  if (!matchDetail) {
    return { ok: false, reason: "not_found" };
  }

  const clubPair = buildMatchClubIdentityPair(matchDetail, input.tenantLogoUrl);

  const participation = await loadSportingActivityDetailParticipation({
    tenantId: input.tenantId,
    actorUserId: input.userId,
    personId: input.personId,
    teamSeasonId: event.teamSeasonId,
    kind: "MATCH",
    eventId: event.id,
  });

  const participantInformation: SportingActivityDetail["participantInformation"] = [];
  const description = event.description?.trim();
  if (description) {
    participantInformation.push({ label: "Hinweise", value: description });
  }

  const participantTeam = buildSportingActivityDetailParticipantTeam({
    tenantClubName: input.tenantClubName,
    tenantLogoUrl: input.tenantLogoUrl,
    teamName,
  });

  const detail: SportingActivityDetail = {
    resourceKey,
    kind: "MATCH",
    presentation,
    teamLabel: teamName,
    participantTeam,
    meetingAt: event.meetingTime?.toISOString() ?? null,
    routeTarget: resolveSportingActivityDetailRouteTarget(presentation),
    participation,
    participantInformation: participantInformation.length > 0 ? participantInformation : undefined,
    match: { clubPair },
  };

  return { ok: true, detail };
}

export async function loadTournamentActivityDetail(input: {
  tenantId: string;
  userId: string;
  personId: string | null;
  permissionKeys: string[];
  personal: Awaited<ReturnType<typeof import("@/lib/dashboard/personal-context").resolvePersonalContext>>;
  eventId: string;
  tenantClubName: string;
  tenantLogoUrl: string | null;
}): Promise<LoadSportingActivityDetailResult> {
  const event = await prisma.event.findFirst({
    where: { id: input.eventId, tenantId: input.tenantId, type: "TOURNAMENT" },
    select: {
      id: true,
      tenantId: true,
      teamId: true,
      teamSeasonId: true,
      type: true,
      status: true,
      reviewStage: true,
      title: true,
      startAt: true,
      endAt: true,
      allDay: true,
      organizerName: true,
      homeAway: true,
      location: true,
      pitchCode: true,
      competitionLabel: true,
      meetingTime: true,
      description: true,
      team: { select: { name: true } },
    },
  });

  if (!event || !event.teamSeasonId) {
    return { ok: false, reason: "not_found" };
  }

  const actor: PersonalEventProjectionActor = {
    userId: input.userId,
    tenantId: input.tenantId,
    permissionKeys: input.permissionKeys,
  };

  if (!isPersonalTeamEventRowRelevant(input.personal, event)) {
    return { ok: false, reason: "forbidden" };
  }
  if (!canIncludeEventInPersonalProjection(actor, event)) {
    return { ok: false, reason: "forbidden" };
  }

  let tournament;
  try {
    tournament = await getTournament(input.tenantId, event.id);
  } catch {
    return { ok: false, reason: "not_found" };
  }

  const allocationDisplays = await batchGetEventAllocationDisplayForTenant(
    [
      {
        type: event.type,
        pitchCode: event.pitchCode,
        homeDressingRoomCode: null,
        awayDressingRoomCode: null,
      },
    ],
    input.tenantId,
  );
  const pitchLabel = allocationDisplays[0]?.pitchLabel ?? null;
  const teamName = event.team?.name ?? undefined;
  const resourceKey = programmeResourceKey("TOURNAMENT", event.id);
  const status = normalizeEventProgrammeStatus(event.status);

  const presentation = buildTournamentActivityPresentation({
    resourceKey,
    title: event.title,
    typeLabel: "Turnier",
    teamName,
    organiserName: event.organizerName,
    homeAway: event.homeAway,
    tenantClubName: input.tenantClubName,
    location: event.location,
    pitchCode: event.pitchCode,
    pitchLabel,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
    status,
  });

  const organiserClubIdentity = buildTournamentOrganiserClubIdentity(tournament);

  const tournamentInfo: SportingActivityDetail["tournament"] = {
    organiserClubIdentity,
    tournamentInfo: [],
  };

  const formatLabel = tournament.competitionLabel?.trim();
  if (formatLabel) {
    tournamentInfo.tournamentInfo.push({ label: "Spielmodus", value: formatLabel });
  }

  const participation = await loadSportingActivityDetailParticipation({
    tenantId: input.tenantId,
    actorUserId: input.userId,
    personId: input.personId,
    teamSeasonId: event.teamSeasonId,
    kind: "TOURNAMENT",
    eventId: event.id,
  });

  const participantInformation: SportingActivityDetail["participantInformation"] = [];
  const description = event.description?.trim();
  if (description) {
    participantInformation.push({ label: "Hinweise", value: description });
  }

  const participantTeam = buildSportingActivityDetailParticipantTeam({
    tenantClubName: input.tenantClubName,
    tenantLogoUrl: input.tenantLogoUrl,
    teamName,
  });

  const detail: SportingActivityDetail = {
    resourceKey,
    kind: "TOURNAMENT",
    presentation,
    teamLabel: teamName,
    participantTeam,
    meetingAt: event.meetingTime?.toISOString() ?? null,
    routeTarget: resolveSportingActivityDetailRouteTarget(presentation),
    participation,
    participantInformation: participantInformation.length > 0 ? participantInformation : undefined,
    tournament: tournamentInfo,
  };

  return { ok: true, detail };
}
