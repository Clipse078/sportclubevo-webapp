import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  isPersonalTeamEventRowRelevant,
  resolveTeamEventContextLabel,
} from "@/lib/dashboard/personal-context";
import { buildPersonalTeamEventQueryScope } from "../personal-programme-universe";
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
import { batchGetEventAllocationDisplayForTenant } from "@/lib/facilities/display-helpers";
import { loadMatchEventPoliciesByEventId } from "@/lib/website/public-matches-identity";
import {
  applyPresentationToProgrammeFields,
  buildGenericSportingEventPresentation,
  buildMatchActivityPresentation,
  buildTournamentActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";

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

export async function loadTeamEventProgrammeItems(
  ctx: PersonalProgrammeAdapterContext,
): Promise<PersonalProgrammeItem[]> {
  const { teamIds, teamSeasonIds } = buildPersonalTeamEventQueryScope(ctx.personal);
  if (teamIds.length === 0 || teamSeasonIds.length === 0) {
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
      teamSeasonId: { in: teamSeasonIds },
      type: { in: ["MATCH", "TOURNAMENT", "OTHER"] },
      startAt: { gte: ctx.rangeStart, lte: ctx.rangeEnd },
    },
    orderBy: [{ startAt: "asc" }, { title: "asc" }],
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
      organizerName: true,
      competitionLabel: true,
      team: { select: { name: true } },
    },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.personal.tenantId },
    select: { name: true },
  });
  const tenantClubName = tenant?.name?.trim() || "Verein";

  const matchAndTournamentIds = candidates
    .filter((event) => event.type === "MATCH" || event.type === "TOURNAMENT")
    .map((event) => event.id);

  const eventPolicyByEventId =
    matchAndTournamentIds.length > 0
      ? await loadMatchEventPoliciesByEventId(ctx.personal.tenantId, matchAndTournamentIds)
      : new Map();

  const allocationDisplays = await batchGetEventAllocationDisplayForTenant(
    candidates.map((event) => ({
      type: event.type,
      pitchCode: event.pitchCode,
      homeDressingRoomCode: null,
      awayDressingRoomCode: null,
    })),
    ctx.personal.tenantId,
  );

  const items: PersonalProgrammeItem[] = [];
  const seen = new Set<string>();

  candidates.forEach((event, index) => {
    if (!isPersonalTeamEventRowRelevant(ctx.personal, event)) {
      return;
    }
    if (!canIncludeEventInPersonalProjection(actor, event)) {
      return;
    }

    const sourceType = eventTypeToProgrammeSourceType(event.type);
    const resourceKey = programmeResourceKey(sourceType, event.id);
    if (seen.has(resourceKey)) return;
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
    const status = normalizeEventProgrammeStatus(event.status);
    const pitchLabel = allocationDisplays[index]?.pitchLabel ?? null;

    let activityPresentation;
    if (event.type === "MATCH") {
      activityPresentation = buildMatchActivityPresentation({
        resourceKey,
        title,
        typeLabel,
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
        policy: eventPolicyByEventId.get(event.id),
        tenantClubName,
      });
    } else if (event.type === "TOURNAMENT") {
      activityPresentation = buildTournamentActivityPresentation({
        resourceKey,
        title: event.title,
        typeLabel,
        teamName,
        organiserName: event.organizerName,
        homeAway: event.homeAway,
        tenantClubName,
        location: event.location,
        pitchCode: event.pitchCode,
        pitchLabel,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        status,
      });
    } else {
      activityPresentation = buildGenericSportingEventPresentation({
        resourceKey,
        title: event.title,
        typeLabel,
        teamName,
        location: event.location,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        status,
        eventType: event.type,
      });
    }

    const presentationFields = applyPresentationToProgrammeFields(activityPresentation, {
      tenantDisplayNames: [tenantClubName],
    });

    items.push({
      id: resourceKey,
      sourceType,
      startsAt: event.startAt,
      endsAt: event.endAt,
      allDay: event.allDay,
      title: presentationFields.title,
      subtitle: presentationFields.subtitle,
      contextLabel,
      venue: presentationFields.venue,
      status,
      deepLink: `/dashboard/planner/edit/${event.id}`,
      teamName,
      opponentName: event.opponentName ?? undefined,
      homeAway: event.homeAway,
      typeLabel,
      eventType: event.type,
      ariaLabel: `${typeLabel}: ${presentationFields.title}`,
      activityPresentation,
    });
  });

  return items;
}
