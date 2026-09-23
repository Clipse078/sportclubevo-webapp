import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  isTeamPersonallyRelevant,
  resolveTeamEventContextLabel,
} from "@/lib/dashboard/personal-context";
import {
  canIncludeEventInPersonalProjection,
  type PersonalEventProjectionActor,
} from "../event-projection-access";
import {
  eventTypeToProgrammeSourceType,
  programmeResourceKey,
  type PersonalProgrammeItem,
} from "../personal-programme-types";
import { normalizeEventProgrammeStatus } from "../programme-status";
import type { PersonalProgrammeAdapterContext } from "@/lib/dashboard/personal-context/programme-adapter-contract";

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

function resolveVenue(input: {
  location: string | null;
  pitchCode: string | null;
}): string | undefined {
  const pitch = input.pitchCode?.trim();
  if (pitch) return pitch;
  const loc = input.location?.trim();
  return loc || undefined;
}

export async function loadTeamEventProgrammeItems(
  ctx: PersonalProgrammeAdapterContext,
): Promise<PersonalProgrammeItem[]> {
  const teamIds = ctx.personal.teams.map((t) => t.teamId);
  if (teamIds.length === 0) {
    return [];
  }

  const actor: PersonalEventProjectionActor = {
    userId: ctx.personal.userId,
    tenantId: ctx.personal.tenantId,
    permissionKeys: ctx.permissionKeys,
  };

  const candidates = await prisma.event.findMany({
    where: {
      tenantId: ctx.personal.tenantId,
      teamId: { in: teamIds },
      startAt: { gte: ctx.rangeStart, lte: ctx.rangeEnd },
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
      homeAway: true,
      location: true,
      pitchCode: true,
      team: { select: { name: true } },
    },
  });

  const items: PersonalProgrammeItem[] = [];
  const seen = new Set<string>();

  for (const event of candidates) {
    if (!event.teamId || !isTeamPersonallyRelevant(ctx.personal, event.teamId)) {
      continue;
    }
    if (!canIncludeEventInPersonalProjection(actor, event)) {
      continue;
    }

    const sourceType = eventTypeToProgrammeSourceType(event.type);
    const resourceKey = programmeResourceKey(sourceType, event.id);
    if (seen.has(resourceKey)) continue;
    seen.add(resourceKey);

    const typeLabel = getEventTypeLabel(event.type);
    const teamName = event.team?.name ?? undefined;
    const title = buildPersonalEventTitle({
      type: event.type,
      title: event.title,
      opponentName: event.opponentName,
      teamName: teamName ?? null,
    });
    const contextLabel = resolveTeamEventContextLabel(ctx.personal, event.teamId);

    items.push({
      id: resourceKey,
      sourceType,
      startsAt: event.startAt,
      endsAt: event.endAt,
      allDay: event.allDay,
      title,
      subtitle: event.type !== "MATCH" && teamName ? teamName : undefined,
      contextLabel,
      venue: resolveVenue({ location: event.location, pitchCode: event.pitchCode }),
      status: normalizeEventProgrammeStatus(event.status),
      deepLink: `/dashboard/planner/edit/${event.id}`,
      teamName,
      opponentName: event.opponentName ?? undefined,
      homeAway: event.homeAway,
      typeLabel,
      eventType: event.type,
      ariaLabel: `${typeLabel}: ${title}`,
    });
  }

  return items;
}
