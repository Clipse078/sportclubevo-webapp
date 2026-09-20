import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  buildEventProjectionId,
  buildMeetingProjectionId,
  type PersonalCalendarItem,
} from "./types";

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
  teamIds: string[];
  rangeStart: Date;
  rangeEnd: Date;
};

export async function loadPersonalCalendarEntryProjections(
  args: LoadPersonalCalendarEntryProjectionsArgs,
): Promise<PersonalCalendarItem[]> {
  const hasTeamScope = args.teamIds.length > 0;
  const hasMeetingScope = Boolean(args.userId);

  if (!hasTeamScope && !hasMeetingScope) {
    return [];
  }

  const [teamEvents, participantMeetings] = await Promise.all([
    hasTeamScope
      ? prisma.event.findMany({
          where: {
            tenantId: args.tenantId,
            teamId: { in: args.teamIds },
            startAt: { gte: args.rangeStart, lte: args.rangeEnd },
          },
          orderBy: [{ startAt: "asc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            type: true,
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

  const items: PersonalCalendarItem[] = [];

  for (const event of teamEvents) {
    const typeLabel = getEventTypeLabel(event.type);
    const title = buildPersonalEventTitle({
      type: event.type,
      title: event.title,
      opponentName: event.opponentName,
      teamName: event.team?.name ?? null,
    });
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
      ariaLabel: `${typeLabel}: ${title}`,
    });
  }

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
      ariaLabel: `Meeting: ${meeting.title}`,
    });
  }

  return items;
}
