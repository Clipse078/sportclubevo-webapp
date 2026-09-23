import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  isTeamPersonallyRelevant,
  meetingParticipantContextLabel,
  resolveTeamEventContextLabel,
  type PersonalContext,
} from "@/lib/dashboard/personal-context";
import {
  buildEventProjectionId,
  buildMeetingProjectionId,
  type PersonalCalendarItem,
} from "./types";
import {
  canIncludeEventInPersonalProjection,
  type PersonalEventProjectionActor,
} from "./event-projection-access";

function getEventTypeLabel(type: EventType): string {
  switch (type) {
    case "TRAINING":
      return "Training";
    case "MATCH":
      return "Spiel";
    case "TOURNAMENT":
      return "Turnier";
    case "OTHER":
      return "Veranstaltung";
    default:
      return type;
  }
}

function buildPersonalEventTitle(input: {
  type: EventType;
  title: string;
  opponentName: string | null;
  teamName: string | null;
}): string {
  if (input.type === "MATCH") {
    const own = input.teamName?.trim();
    const opp = input.opponentName?.trim();
    if (own && opp) return `${own} – ${opp}`;
    if (opp) return opp;
    if (own) return own;
  }
  return input.title;
}

export type LoadPersonalCalendarEntryProjectionsArgs = {
  tenantId: string;
  userId: string | null | undefined;
  personalContext: PersonalContext;
  actor: PersonalEventProjectionActor;
  rangeStart: Date;
  rangeEnd: Date;
};

export async function loadPersonalCalendarEntryProjections(
  args: LoadPersonalCalendarEntryProjectionsArgs,
): Promise<PersonalCalendarItem[]> {
  const teamIds = args.personalContext.teams.map((t) => t.teamId);
  const hasTeamScope = teamIds.length > 0;
  const hasMeetingScope = Boolean(args.userId);

  if (!hasTeamScope && !hasMeetingScope) {
    return [];
  }

  const [teamEventCandidates, participantMeetings] = await Promise.all([
    hasTeamScope
      ? prisma.event.findMany({
          where: {
            tenantId: args.tenantId,
            teamId: { in: teamIds },
            startAt: { gte: args.rangeStart, lte: args.rangeEnd },
          },
          orderBy: [{ startAt: "asc" }, { title: "asc" }],
          select: {
            id: true,
            tenantId: true,
            teamId: true,
            type: true,
            status: true,
            reviewStage: true,
            title: true,
            startAt: true,
            endAt: true,
            allDay: true,
            opponentName: true,
            team: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    hasMeetingScope
      ? prisma.meeting.findMany({
          where: {
            tenantId: args.tenantId,
            status: "PLANNED",
            meetingDate: { gte: args.rangeStart, lte: args.rangeEnd },
            participants: { some: { userId: args.userId! } },
          },
          orderBy: { meetingDate: "asc" },
          select: {
            id: true,
            slug: true,
            title: true,
            meetingDate: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const authorizedEvents = teamEventCandidates.filter((event) => {
    if (!event.teamId || !isTeamPersonallyRelevant(args.personalContext, event.teamId)) {
      return false;
    }
    return canIncludeEventInPersonalProjection(args.actor, event);
  });

  const items: PersonalCalendarItem[] = [];
  const seenEventIds = new Set<string>();

  for (const event of authorizedEvents) {
    if (seenEventIds.has(event.id)) continue;
    seenEventIds.add(event.id);

    const typeLabel = getEventTypeLabel(event.type);
    const title = buildPersonalEventTitle({
      type: event.type,
      title: event.title,
      opponentName: event.opponentName,
      teamName: event.team?.name ?? null,
    });
    const contextLabel = resolveTeamEventContextLabel(args.personalContext, event.teamId);

    items.push({
      id: buildEventProjectionId(event.id),
      sourceType: "TEAM_EVENT",
      title,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: event.allDay,
      href: `/dashboard/planner/edit/${event.id}`,
      typeLabel,
      eventType: event.type,
      subtitle:
        event.type !== "MATCH" && event.team?.name ? event.team.name : undefined,
      contextLabel,
      ariaLabel: `${typeLabel}: ${title}`,
    });
  }

  const meetingLabel = meetingParticipantContextLabel().label;

  for (const meeting of participantMeetings) {
    items.push({
      id: buildMeetingProjectionId(meeting.id),
      sourceType: "MEETING",
      title: meeting.title,
      startAt: meeting.meetingDate,
      endAt: null,
      href: `/vereinsleitung/meetings/${meeting.slug}`,
      typeLabel: "Meeting",
      eventType: "MEETING",
      contextLabel: meetingLabel,
      ariaLabel: `Meeting: ${meeting.title}`,
    });
  }

  return items;
}
