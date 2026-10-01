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
  participationResponseDueAt: Date | null;
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
  teamSeasonId: string | null;
  eventKind: AttendanceEventKind;
  trainingSessionId: string | null;
  eventId: string | null;
}): string {
  if (input.eventKind === "TRAINING") {
    return `${input.personId}:${input.teamSeasonId}:TRAINING:${input.trainingSessionId}`;
  }
  return `${input.personId}:${input.teamSeasonId}:${input.eventKind}:${input.eventId}`;
}

function sortAttendanceCandidatesByUrgency(
  candidates: AttendanceObligationCandidate[],
): AttendanceObligationCandidate[] {
  return [...candidates].sort((a, b) => {
    const dueA = a.participationResponseDueAt?.getTime() ?? a.eventStartAt.getTime();
    const dueB = b.participationResponseDueAt?.getTime() ?? b.eventStartAt.getTime();
    if (dueA !== dueB) return dueA - dueB;
    return a.eventStartAt.getTime() - b.eventStartAt.getTime();
  });
}

export async function loadAttendanceObligationCandidates(
  tenantId: string,
  authorizedPersonIds: readonly string[],
  now: Date = new Date(),
  actionableCap?: number,
): Promise<AttendanceObligationCandidate[]> {
  const personIds = [...authorizedPersonIds];
  if (personIds.length === 0) {
    return [];
  }

  const until = horizonEnd(now);

  const squadMemberships = await prisma.playerSquadMember.findMany({
    where: {
      personId: { in: personIds },
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

  const [trainingSessions, calendarEvents] = await Promise.all([
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
        participationResponseDueAt: true,
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
        status: { not: "CANCELLED" },
        startAt: { gte: now, lte: until },
      },
      select: {
        id: true,
        teamId: true,
        seasonId: true,
        type: true,
        title: true,
        startAt: true,
        participationResponseDueAt: true,
      },
      orderBy: [{ startAt: "asc" }],
    }),
  ]);

  const trainingSessionIds = trainingSessions.map((session) => session.id);
  const calendarEventIds = calendarEvents.map((event) => event.id);

  const responseEventFilters: Array<Record<string, unknown>> = [];
  if (trainingSessionIds.length > 0) {
    responseEventFilters.push({
      eventKind: "TRAINING" as const,
      trainingSessionId: { in: trainingSessionIds },
    });
  }
  if (calendarEventIds.length > 0) {
    responseEventFilters.push({
      eventKind: { in: ["MATCH", "TOURNAMENT"] as const },
      eventId: { in: calendarEventIds },
    });
  }

  const responses =
    responseEventFilters.length === 0
      ? []
      : await prisma.participationResponse.findMany({
          where: {
            tenantId,
            personId: { in: personIds },
            teamSeasonId: { in: teamSeasonIds },
            OR: responseEventFilters,
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
        });

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
      participationResponseDueAt: Date | null;
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
      participationResponseDueAt: session.participationResponseDueAt,
    });
  }

  const teamSeasonIdsByTeamSeasonPair = new Map<string, string[]>();
  for (const [teamSeasonId, meta] of teamSeasonMeta.entries()) {
    const pairKey = `${meta.teamId}:${meta.seasonId}`;
    const bucket = teamSeasonIdsByTeamSeasonPair.get(pairKey) ?? [];
    bucket.push(teamSeasonId);
    teamSeasonIdsByTeamSeasonPair.set(pairKey, bucket);
  }

  for (const calendarEvent of calendarEvents) {
    const pairKey = `${calendarEvent.teamId}:${calendarEvent.seasonId}`;
    if (!allowedSeasonTeamPairs.has(pairKey)) continue;
    if (calendarEvent.type !== "MATCH" && calendarEvent.type !== "TOURNAMENT") continue;

    const matchingTeamSeasonIds = teamSeasonIdsByTeamSeasonPair.get(pairKey) ?? [];
    for (const teamSeasonId of matchingTeamSeasonIds) {
      const list = eventsByTeamSeason.get(teamSeasonId);
      if (!list) continue;
      list.push({
        eventKind: calendarEvent.type,
        eventId: calendarEvent.id,
        title: calendarEvent.title,
        startAt: calendarEvent.startAt,
        participationResponseDueAt: calendarEvent.participationResponseDueAt,
      });
    }
  }

  type PendingCandidate = Omit<AttendanceObligationCandidate, "responseId" | "responseStatus"> & {
    responseId: string | null;
    responseStatus: ParticipationResponseStatus;
  };

  const pending: PendingCandidate[] = [];

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

      pending.push({
        personId: membership.personId,
        personDisplayName,
        teamSeasonId: membership.teamSeasonId,
        teamDisplayName,
        eventKind: event.eventKind,
        trainingSessionId: event.trainingSessionId,
        eventId: event.eventId,
        eventTitle: event.title,
        eventStartAt: event.startAt,
        participationResponseDueAt: event.participationResponseDueAt,
        responseId: response?.id ?? null,
        responseStatus: status,
      });
    }
  }

  if (actionableCap != null && actionableCap > 0) {
    return sortAttendanceCandidatesByUrgency(pending).slice(0, actionableCap);
  }
  return pending;
}

export function filterActionableAttendanceCandidates(
  candidates: AttendanceObligationCandidate[],
): AttendanceObligationCandidate[] {
  return candidates.filter((c) => isActionableParticipationStatus(c.responseStatus));
}
