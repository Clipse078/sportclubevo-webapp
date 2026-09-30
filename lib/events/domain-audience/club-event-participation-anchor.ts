/**
 * SCE-EVENTS-AUDIENCE-01 — club-event participation anchor without squad teamSeason requirement.
 */

import { prisma } from "@/lib/db/prisma";
import type { ResolvedEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";
import { isClubEventType } from "@/lib/events/domain-audience/club-event-relevance";

export async function resolveClubEventParticipationAnchor(input: {
  tenantId: string;
  eventId: string;
}): Promise<ResolvedEventParticipationAnchor> {
  const calendarEvent = await prisma.event.findFirst({
    where: { id: input.eventId, tenantId: input.tenantId, type: "OTHER" },
    select: {
      id: true,
      title: true,
      startAt: true,
      type: true,
      teamId: true,
      teamSeasonId: true,
    },
  });
  if (!calendarEvent || !isClubEventType(calendarEvent.type)) {
    throw new TeamCommunicationNotFoundError("club event not found");
  }

  return {
    tenantId: input.tenantId,
    teamId: calendarEvent.teamId ?? "",
    teamSeasonId: calendarEvent.teamSeasonId ?? "",
    title: calendarEvent.title,
    startAt: calendarEvent.startAt,
    participationEvent: { eventKind: "CLUB_EVENT", eventId: calendarEvent.id },
    contextEventId: calendarEvent.id,
    anchorRef: {
      eventKind: "CLUB_EVENT",
      eventId: calendarEvent.id,
      teamSeasonId: calendarEvent.teamSeasonId ?? "",
      contextEventId: calendarEvent.id,
    },
  };
}
