/**
 * SCE-COMM-10 — resolve participation anchors and team scope for Event-context communication.
 */

import { prisma } from "@/lib/db/prisma";
import type { ParticipationEventRef } from "@/lib/participation/types";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";
import type { EventParticipationAnchorRef } from "@/lib/communication/event/orchestration-meta";

export type ResolvedEventParticipationAnchor = {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  title: string;
  startAt: Date;
  participationEvent: ParticipationEventRef;
  contextEventId: string;
  anchorRef: EventParticipationAnchorRef;
};

export function participationEventRefToContextEventId(event: ParticipationEventRef): string {
  if (event.eventKind === "TRAINING") {
    return event.trainingSessionId;
  }
  return event.eventId;
}

export async function resolveEventParticipationAnchor(input: {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  event: ParticipationEventRef;
}): Promise<ResolvedEventParticipationAnchor> {
  const teamSeason = await prisma.teamSeason.findFirst({
    where: {
      id: input.teamSeasonId,
      teamId: input.teamId,
      team: { tenantId: input.tenantId },
    },
    select: { id: true, teamId: true, seasonId: true },
  });
  if (!teamSeason) {
    throw new TeamCommunicationNotFoundError("team season not found");
  }

  if (input.event.eventKind === "TRAINING") {
    const session = await prisma.trainingSession.findFirst({
      where: {
        id: input.event.trainingSessionId,
        tenantId: input.tenantId,
        teamSeasonId: input.teamSeasonId,
      },
      select: {
        id: true,
        startAt: true,
        trainingSeries: { select: { title: true } },
      },
    });
    if (!session) throw new TeamCommunicationNotFoundError("training session not found");

    const contextEventId = session.id;
    return {
      tenantId: input.tenantId,
      teamId: input.teamId,
      teamSeasonId: input.teamSeasonId,
      title: session.trainingSeries.title,
      startAt: session.startAt,
      participationEvent: input.event,
      contextEventId,
      anchorRef: {
        eventKind: "TRAINING",
        trainingSessionId: session.id,
        teamSeasonId: input.teamSeasonId,
        contextEventId,
      },
    };
  }

  const calendarEvent = await prisma.event.findFirst({
    where: {
      id: input.event.eventId,
      tenantId: input.tenantId,
      type: input.event.eventKind === "CLUB_EVENT" ? "OTHER" : input.event.eventKind,
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      teamId: true,
      teamSeasonId: true,
      seasonId: true,
    },
  });
  if (!calendarEvent) throw new TeamCommunicationNotFoundError("event not found");

  if (input.event.eventKind !== "CLUB_EVENT") {
    if (calendarEvent.teamId !== input.teamId) {
      throw new TeamCommunicationNotFoundError("event team mismatch");
    }
  }

  return {
    tenantId: input.tenantId,
    teamId: input.teamId,
    teamSeasonId: input.teamSeasonId,
    title: calendarEvent.title,
    startAt: calendarEvent.startAt,
    participationEvent: input.event,
    contextEventId: calendarEvent.id,
    anchorRef: {
      eventKind: input.event.eventKind,
      eventId: calendarEvent.id,
      teamSeasonId: input.teamSeasonId,
      contextEventId: calendarEvent.id,
    },
  };
}

export async function resolveTeamIdForEventContextRef(input: {
  tenantId: string;
  contextEventId: string;
}): Promise<string | null> {
  const event = await prisma.event.findFirst({
    where: { id: input.contextEventId, tenantId: input.tenantId },
    select: { teamId: true },
  });
  if (event?.teamId) return event.teamId;

  const training = await prisma.trainingSession.findFirst({
    where: { id: input.contextEventId, tenantId: input.tenantId },
    select: { teamSeason: { select: { teamId: true } } },
  });
  return training?.teamSeason.teamId ?? null;
}
