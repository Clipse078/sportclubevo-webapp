/**
 * Batched read-side attendance obligations for PersonalAction (no writes).
 */

import type { AttendanceEventKind, ParticipationResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS } from "../config";

export type AttendanceObligationCandidate = {
  personId: string;
  personDisplayName: string;
  teamSeasonId: string;
  teamDisplayName: string;
  eventKind: "TRAINING" | "MATCH" | "TOURNAMENT";
  trainingSessionId?: string;
  eventId?: string;
  eventTitle: string;
  eventStartAt: Date;
  responseId: string | null;
  responseStatus: ParticipationResponseStatus;
};

function formatPersonName(input: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  return input.displayName?.trim() || `${input.firstName} ${input.lastName}`.trim();
}

function isActionableParticipationStatus(status: ParticipationResponseStatus): boolean {
  return status === "OPEN";
}

function horizonEnd(from: Date): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS);
  return end;
}

function responseLookupKey(input: {
  personId: string;
  teamSeasonId: string;
  eventKind: AttendanceEventKind;
  trainingSessionId: string | null;
  eventId: string | null;
}): string {
  if (input.eventKind === "TRAINING") {
    return `${input.personId}:${input.teamSeasonId}:TRAINING:${input.trainingSessionId}`;
  }
  return `${input.personId}:${input.teamSeasonId}:${input.eventKind}:${input.eventId}`;
}

export async function loadAttendanceObligationCandidates(
  tenantId: string,
  authorizedPersonIds: string[],
  now: Date = new Date(),
): Promise<AttendanceObligationCandidate[]> {
  if (authorizedPersonIds.length === 0) {
    return [];
  }

  const until = horizonEnd(now);

  const squadMemberships = await prisma.playerSquadMember.findMany({
    where: {
      personId: { in: authorizedPersonIds },
      teamSeason: {
        status: "ACTIVE",
        team: { tenantId },
      },
    },
    select: {
      personId: true,
      teamSeasonId: true,
      person: {
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
        },
      },
      teamSeason: {
        select: {
          teamId: true,
          seasonId: true,
          displayName: true,
          team: { select: { name: true } },
        },
      },
    },
  });

  if (squadMemberships.length === 0) {
    return [];
  }

  const teamSeasonIds = [...new Set(squadMemberships.map((m) => m.teamSeasonId))];
  const teamSeasonMeta = new Map(
    squadMemberships.map((m) => [
      m.teamSeasonId,
      {
        teamId: m.teamSeason.teamId,
        seasonId: m.teamSeason.seasonId,
      },
    ]),
  );

  const allowedSeasonTeamPairs = new Set(
    squadMemberships.map(
      (m) => `${m.teamSeason.teamId}:${m.teamSeason.seasonId}`,
    ),
  );

  const teamIds = [...new Set(squadMemberships.map((m) => m.teamSeason.teamId))];
  const seasonIds = [...new Set(squadMemberships.map((m) => m.teamSeason.seasonId))];

  const [trainingSessions, calendarEvents, responses] = await Promise.all([
    prisma.trainingSession.findMany({
      where: {
        tenantId,
        teamSeasonId: { in: teamSeasonIds },
        status: "SCHEDULED",
        startAt: { gte: now, lte: until },
      },
      select: {
        id: true,
        teamSeasonId: true,
        startAt: true,
        trainingSeries: { select: { title: true } },
      },
      orderBy: [{ startAt: "asc" }],
    }),
    prisma.event.findMany({
      where: {
        tenantId,
        teamId: { in: teamIds },
        seasonId: { in: seasonIds },
        type: { in: ["MATCH", "TOURNAMENT"] },
        startAt: { gte: now, lte: until },
      },
      select: {
        id: true,
        teamId: true,
        seasonId: true,
        type: true,
        title: true,
        startAt: true,
      },
      orderBy: [{ startAt: "asc" }],
    }),
    prisma.participationResponse.findMany({
      where: {
        tenantId,
        personId: { in: authorizedPersonIds },
        teamSeasonId: { in: teamSeasonIds },
      },
      select: {
        id: true,
        personId: true,
        teamSeasonId: true,
        eventKind: true,
        trainingSessionId: true,
        eventId: true,
        status: true,
      },
    }),
  ]);

  const responseByKey = new Map(
    responses.map((response) => [
      responseLookupKey({
        personId: response.personId,
        teamSeasonId: response.teamSeasonId,
        eventKind: response.eventKind,
        trainingSessionId: response.trainingSessionId,
        eventId: response.eventId,
      }),
      response,
    ]),
  );

  const eventsByTeamSeason = new Map<
    string,
    Array<{
      eventKind: "TRAINING" | "MATCH" | "TOURNAMENT";
      trainingSessionId?: string;
      eventId?: string;
      title: string;
      startAt: Date;
    }>
  >();

  for (const teamSeasonId of teamSeasonIds) {
    eventsByTeamSeason.set(teamSeasonId, []);
  }

  for (const session of trainingSessions) {
    const list = eventsByTeamSeason.get(session.teamSeasonId);
    if (!list) continue;
    list.push({
      eventKind: "TRAINING",
      trainingSessionId: session.id,
      title: session.trainingSeries.title,
      startAt: session.startAt,
    });
  }

  for (const calendarEvent of calendarEvents) {
    const pairKey = `${calendarEvent.teamId}:${calendarEvent.seasonId}`;
    if (!allowedSeasonTeamPairs.has(pairKey)) continue;

    for (const [teamSeasonId, meta] of teamSeasonMeta.entries()) {
      if (meta.teamId !== calendarEvent.teamId || meta.seasonId !== calendarEvent.seasonId) {
        continue;
      }
      const list = eventsByTeamSeason.get(teamSeasonId);
      if (!list) continue;
      if (calendarEvent.type !== "MATCH" && calendarEvent.type !== "TOURNAMENT") continue;
      list.push({
        eventKind: calendarEvent.type,
        eventId: calendarEvent.id,
        title: calendarEvent.title,
        startAt: calendarEvent.startAt,
      });
    }
  }

  const candidates: AttendanceObligationCandidate[] = [];

  for (const membership of squadMemberships) {
    const teamDisplayName =
      membership.teamSeason.displayName || membership.teamSeason.team.name;
    const personDisplayName = formatPersonName(membership.person);
    const events = eventsByTeamSeason.get(membership.teamSeasonId) ?? [];

    for (const event of events) {
      const response = responseByKey.get(
        responseLookupKey({
          personId: membership.personId,
          teamSeasonId: membership.teamSeasonId,
          eventKind: event.eventKind,
          trainingSessionId: event.trainingSessionId ?? null,
          eventId: event.eventId ?? null,
        }),
      );
      const status = response?.status ?? "OPEN";
      if (!isActionableParticipationStatus(status)) {
        continue;
      }

      candidates.push({
        personId: membership.personId,
        personDisplayName,
        teamSeasonId: membership.teamSeasonId,
        teamDisplayName,
        eventKind: event.eventKind,
        trainingSessionId: event.trainingSessionId,
        eventId: event.eventId,
        eventTitle: event.title,
        eventStartAt: event.startAt,
        responseId: response?.id ?? null,
        responseStatus: status,
      });
    }
  }

  return candidates;
}

export function filterActionableAttendanceCandidates(
  candidates: AttendanceObligationCandidate[],
): AttendanceObligationCandidate[] {
  return candidates.filter((c) => isActionableParticipationStatus(c.responseStatus));
}
