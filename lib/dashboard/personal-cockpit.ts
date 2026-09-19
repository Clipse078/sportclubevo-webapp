/**
 * DASHBOARD-UX-01 — Personal operational cockpit builders and constants.
 */

import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getDayWindow, formatIsoDay } from "@/lib/planner/date-utils";
import type { CommandCenterKpi } from "@/lib/dashboard/command-center";
import { formatTime, type TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export type PersonalAgendaDayGroup = "today" | "tomorrow";

export type PersonalAgendaItem = {
  key: string;
  sortAt: Date;
  timeLabel: string;
  typeLabel: string;
  eventType?: EventType | "MEETING";
  title: string;
  subtitle?: string;
  href?: string;
  dayGroup: PersonalAgendaDayGroup;
};

export type PersonalCockpitExtension = {
  personalAgendaItems: PersonalAgendaItem[];
  personalAgendaSupported: boolean;
  personalTaskCount: number | null;
  kpiStrip: CommandCenterKpi[];
};

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

function resolveAgendaDayGroup(
  sortAt: Date,
  todayWindow: { start: Date; end: Date },
  tomorrowWindow: { start: Date; end: Date },
): PersonalAgendaDayGroup | null {
  const ts = sortAt.getTime();
  if (ts >= todayWindow.start.getTime() && ts <= todayWindow.end.getTime()) {
    return "today";
  }
  if (ts >= tomorrowWindow.start.getTime() && ts <= tomorrowWindow.end.getTime()) {
    return "tomorrow";
  }
  return null;
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

export async function resolvePersonalTeamIds(args: {
  tenantId: string;
  userId: string | null | undefined;
}): Promise<{ teamIds: string[]; hasLinkedPerson: boolean }> {
  if (!args.userId) {
    return { teamIds: [], hasLinkedPerson: false };
  }

  const person = await prisma.person.findFirst({
    where: { tenantId: args.tenantId, userId: args.userId },
    select: { id: true },
  });

  if (!person) {
    return { teamIds: [], hasLinkedPerson: false };
  }

  const [trainerRows, squadRows] = await Promise.all([
    prisma.trainerTeamMember.findMany({
      where: {
        personId: person.id,
        status: "ACTIVE",
        teamSeason: { team: { tenantId: args.tenantId } },
      },
      select: { teamSeason: { select: { teamId: true } } },
    }),
    prisma.playerSquadMember.findMany({
      where: {
        personId: person.id,
        status: "ACTIVE",
        teamSeason: { team: { tenantId: args.tenantId } },
      },
      select: { teamSeason: { select: { teamId: true } } },
    }),
  ]);

  const teamIds = [
    ...new Set(
      [
        ...trainerRows.map((row) => row.teamSeason.teamId),
        ...squadRows.map((row) => row.teamSeason.teamId),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  return { teamIds, hasLinkedPerson: true };
}

export async function loadPersonalAgendaItems(args: {
  tenantId: string;
  userId: string | null | undefined;
  teamIds: string[];
  hasLinkedPerson: boolean;
  fmtCfg: TenantFormatConfig;
  now?: Date;
}): Promise<{ items: PersonalAgendaItem[]; supported: boolean }> {
  const now = args.now ?? new Date();
  const todayWindow = getDayWindow(formatIsoDay(now));
  const tomorrowDay = getDayWindow(
    formatIsoDay(new Date(todayWindow.end.getTime() + 24 * 60 * 60 * 1000)),
  );

  const hasTeamScope = args.teamIds.length > 0;
  const hasMeetingScope = Boolean(args.userId);

  if (!args.hasLinkedPerson && !hasMeetingScope) {
    return { items: [], supported: false };
  }

  const windowEnd = tomorrowDay.end;

  const [teamEvents, participantMeetings] = await Promise.all([
    hasTeamScope
      ? prisma.event.findMany({
          where: {
            tenantId: args.tenantId,
            teamId: { in: args.teamIds },
            startAt: { gte: todayWindow.start, lte: windowEnd },
          },
          orderBy: [{ startAt: "asc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            type: true,
            startAt: true,
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
            meetingDate: { gte: todayWindow.start, lte: windowEnd },
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

  const items: PersonalAgendaItem[] = [];

  for (const event of teamEvents) {
    const dayGroup = resolveAgendaDayGroup(event.startAt, todayWindow, tomorrowDay);
    if (!dayGroup) continue;

    items.push({
      key: `event-${event.id}`,
      sortAt: event.startAt,
      timeLabel: formatTime(event.startAt, args.fmtCfg),
      typeLabel: getEventTypeLabel(event.type),
      eventType: event.type,
      title: buildPersonalEventTitle({
        type: event.type,
        title: event.title,
        opponentName: event.opponentName,
        teamName: event.team?.name ?? null,
      }),
      subtitle:
        event.type !== "MATCH" && event.team?.name ? event.team.name : undefined,
      href: `/dashboard/planner/edit/${event.id}`,
      dayGroup,
    });
  }

  for (const meeting of participantMeetings) {
    const dayGroup = resolveAgendaDayGroup(meeting.meetingDate, todayWindow, tomorrowDay);
    if (!dayGroup) continue;

    items.push({
      key: `meeting-${meeting.id}`,
      sortAt: meeting.meetingDate,
      timeLabel: formatTime(meeting.meetingDate, args.fmtCfg),
      typeLabel: "Meeting",
      eventType: "MEETING",
      title: meeting.title,
      href: `/vereinsleitung/meetings/${meeting.slug}`,
      dayGroup,
    });
  }

  items.sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime());

  return {
    items,
    supported: args.hasLinkedPerson || hasMeetingScope,
  };
}

export function buildPersonalCockpitKpiStrip(input: {
  personalScheduleCount: number | null;
  personalTasksAvailable: boolean;
  personalTaskCount: number | null;
  attentionCount: number;
  openRegistrationCount: number;
  canSeeRegistrations: boolean;
}): CommandCenterKpi[] {
  const kpis: CommandCenterKpi[] = [
    {
      key: "my-tasks",
      label: "Meine Aufgaben",
      value:
        input.personalTasksAvailable && input.personalTaskCount !== null
          ? String(input.personalTaskCount)
          : "—",
      context: undefined,
    },
    {
      key: "my-schedule",
      label: "Meine Termine",
      value:
        input.personalScheduleCount !== null
          ? String(input.personalScheduleCount)
          : "—",
      context:
        input.personalScheduleCount === null
          ? "Persönliche Zuordnung nicht verfügbar"
          : undefined,
    },
    {
      key: "attention",
      label: "Benötigt Aufmerksamkeit",
      value: String(input.attentionCount),
    },
  ];

  if (input.canSeeRegistrations) {
    kpis.push({
      key: "registrations",
      label: "Offene Anmeldungen",
      value: String(input.openRegistrationCount),
    });
  }

  return kpis.slice(0, 4);
}

export function groupPersonalAgendaItems(
  items: PersonalAgendaItem[],
): { today: PersonalAgendaItem[]; tomorrow: PersonalAgendaItem[] } {
  return {
    today: items.filter((item) => item.dayGroup === "today"),
    tomorrow: items.filter((item) => item.dayGroup === "tomorrow"),
  };
}
