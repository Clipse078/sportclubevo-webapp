import { prisma } from "@/lib/db/prisma";
import { listTrainingSessions } from "@/lib/training/session-generation-service";
import {
  listMatchcenterMatches,
  type MatchcenterQueryDatabase,
} from "@/lib/matchcenter/query-service";
import type { ReviewWorkflowStage } from "@prisma/client";
import { listTournaments } from "@/lib/tournaments/tournament-service";
import { getTournamentParticipatingTeams } from "@/lib/tournaments/team-participation";
import { canIncludeEventInPersonalProjection } from "@/lib/personal-agenda/event-projection-access";
import { canIncludeTrainingSessionInPersonalProjection } from "@/lib/personal-agenda/training-projection-access";
import { normalizeEventProgrammeStatus } from "@/lib/personal-agenda/programme-status";
import { resolveTrainingSessionDateBoundsForProgrammeRange } from "@/lib/personal-agenda/training-programme-range";
import { clubEventManagementVisibilityWhere } from "@/lib/events/club-event-published-visibility";
import type { ClubEventOrganisationalAudienceSnapshot } from "@/lib/events/club-event-programme-eligibility";
import {
  buildGenericSportingEventPresentation,
  buildTrainingActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";
import { batchGetEventAllocationDisplayForTenant } from "@/lib/facilities/display-helpers";
import { loadTrainingSessionFacilityHints } from "@/lib/sporting-activity-presentation/training-facility-batch";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical/adapters/match";
import { resolveSceTournamentPresentation } from "@/lib/sporting-activity-presentation/canonical/adapters/tournament";
import { resolveSceTrainingPresentationFromLegacy } from "@/lib/sporting-activity-presentation/canonical/adapters/training";
import { resolveSceClubEventPresentationFromLegacy } from "@/lib/sporting-activity-presentation/canonical/adapters/club-event";
import { buildSportingActivityDetailHref } from "@/lib/sporting-activity-detail/href";
import { buildSceActivityRoute } from "@/lib/sporting-activity-presentation/canonical/route";
import type { PersonalEventProjectionActor } from "@/lib/personal-agenda/event-projection-access";
import { isClubEventRelevantToTeamProgrammeContext } from "./club-event-team-relevance";
import { buildProgrammeItemId, buildProgrammeResourceKey } from "./programme-item-id";
import type { ProgrammeItem, ProgrammeScope } from "./types";

type LoadContext = {
  tenantId: string;
  timeZone: string;
  rangeStart: Date;
  rangeEnd: Date;
  actor: PersonalEventProjectionActor;
  tenantClubName: string;
  tenantLogoUrl?: string | null;
};

function clubEventAudienceFromRow(row: {
  clubEventOrganisationalScope: string;
  clubEventOrganisationalAudienceTeams: { teamId: string }[];
  clubEventOrganisationalAudienceOrgUnits: { orgUnitId: string }[];
}): ClubEventOrganisationalAudienceSnapshot {
  return {
    scope: row.clubEventOrganisationalScope as ClubEventOrganisationalAudienceSnapshot["scope"],
    teamIds: row.clubEventOrganisationalAudienceTeams.map((t) => t.teamId),
    orgUnitIds: row.clubEventOrganisationalAudienceOrgUnits.map((o) => o.orgUnitId),
  };
}

function navigationTargetForKind(
  kind: ProgrammeItem["kind"],
  domainId: string,
): string {
  const route = buildSceActivityRoute(
    kind === "CLUB_EVENT" ? "CLUB_EVENT" : kind,
    buildProgrammeResourceKey(kind, domainId),
  );
  return route.consumeHref ?? route.manageHref ?? "#";
}

async function loadTrainingProgrammeItems(
  ctx: LoadContext,
  scope: ProgrammeScope,
): Promise<ProgrammeItem[]> {
  const teamSeasonIds =
    scope.kind === "TEAM"
      ? [scope.teamSeasonId]
      : undefined;

  const { dateFrom, dateTo } = resolveTrainingSessionDateBoundsForProgrammeRange({
    rangeStart: ctx.rangeStart,
    rangeEnd: ctx.rangeEnd,
    timeZone: ctx.timeZone,
  });

  const sessions = await listTrainingSessions(ctx.tenantId, {
    teamSeasonIds,
    dateFrom,
    dateTo,
  });

  if (sessions.length === 0) return [];

  const facilityHints = await loadTrainingSessionFacilityHints(
    ctx.tenantId,
    sessions.map((s) => ({ id: s.id, trainingSeriesId: s.trainingSeriesId })),
  );

  const teamSeasonRows = await prisma.teamSeason.findMany({
    where: {
      id: { in: [...new Set(sessions.map((s) => s.teamSeasonId))] },
      team: { tenantId: ctx.tenantId },
    },
    select: { id: true, teamId: true, team: { select: { orgUnitId: true } } },
  });
  const teamContextBySeasonId = new Map(
    teamSeasonRows.map((row) => [
      row.id,
      { teamId: row.teamId, orgUnitId: row.team.orgUnitId },
    ]),
  );

  const items: ProgrammeItem[] = [];

  for (const session of sessions) {
    if (
      !canIncludeTrainingSessionInPersonalProjection(ctx.actor, {
        id: session.id,
        tenantId: session.tenantId,
        teamSeasonId: session.teamSeasonId,
        status: session.status,
      })
    ) {
      continue;
    }

    if (scope.kind === "TEAM" && session.teamSeasonId !== scope.teamSeasonId) {
      continue;
    }

    const startsAt = new Date(session.startAt);
    if (startsAt < ctx.rangeStart || startsAt > ctx.rangeEnd) continue;

    const resourceKey = buildProgrammeResourceKey("TRAINING", session.id);
    const facility = facilityHints.get(session.id);
    const status = session.status === "CANCELLED" ? "cancelled" : session.status === "POSTPONED" || session.status === "MOVED" ? "postponed" : "scheduled";

    const legacyPresentation = buildTrainingActivityPresentation({
      resourceKey,
      title: session.trainingSeriesTitle?.trim() || "Training",
      typeLabel: "Training",
      teamName: session.teamName ?? undefined,
      clubName: ctx.tenantClubName,
      facilityName: facility?.facilityName ?? undefined,
      pitchResourceName: facility?.pitchResourceName ?? undefined,
      startAt: new Date(session.startAt),
      endAt: session.endAt ? new Date(session.endAt) : null,
      status,
    });

    const presentation = resolveSceTrainingPresentationFromLegacy(legacyPresentation);
    const domainId = session.id;

    items.push({
      id: buildProgrammeItemId("TRAINING", domainId),
      kind: "TRAINING",
      domainId,
      resourceKey,
      startsAt,
      endsAt: session.endAt ? new Date(session.endAt) : null,
      allDay: false,
      presentation,
      teamId: teamContextBySeasonId.get(session.teamSeasonId)?.teamId ?? null,
      teamSeasonId: session.teamSeasonId,
      orgUnitId: teamContextBySeasonId.get(session.teamSeasonId)?.orgUnitId ?? null,
      status,
      navigationTarget:
        buildSportingActivityDetailHref("TRAINING", domainId) ??
        navigationTargetForKind("TRAINING", domainId),
    });
  }

  return items;
}

async function loadMatchProgrammeItems(
  ctx: LoadContext,
  scope: ProgrammeScope,
): Promise<ProgrammeItem[]> {
  const matches = await listMatchcenterMatches(prisma as unknown as MatchcenterQueryDatabase, {
    tenantId: ctx.tenantId,
    from: ctx.rangeStart,
    to: ctx.rangeEnd,
  });

  const filtered =
    scope.kind === "TEAM"
      ? matches.filter((m) => m.teamSeasonId === scope.teamSeasonId)
      : matches;

  if (filtered.length === 0) return [];

  const allocationDisplays = await batchGetEventAllocationDisplayForTenant(
    filtered.map((m) => ({
      type: "MATCH" as const,
      pitchCode: m.operational.pitchCode,
      homeDressingRoomCode: null,
      awayDressingRoomCode: null,
    })),
    ctx.tenantId,
  );

  const items: ProgrammeItem[] = [];

  filtered.forEach((match, index) => {
    if (
      !canIncludeEventInPersonalProjection(ctx.actor, {
        id: match.id,
        tenantId: ctx.tenantId,
        teamId: match.teamId,
        type: "MATCH",
        status: match.status,
        reviewStage: match.reviewStage as ReviewWorkflowStage,
      })
    ) {
      return;
    }

    const pitchLabel = allocationDisplays[index]?.pitchLabel ?? null;
    const presentation = resolveSceMatchPresentation({
      match,
      tenantClubName: ctx.tenantClubName,
      tenantLogoUrl: ctx.tenantLogoUrl,
      pitchLabel,
      timezone: ctx.timeZone,
    });

    const status = normalizeEventProgrammeStatus(match.status);
    const domainId = match.id;
    const resourceKey = buildProgrammeResourceKey("MATCH", domainId);

    items.push({
      id: buildProgrammeItemId("MATCH", domainId),
      kind: "MATCH",
      domainId,
      resourceKey,
      startsAt: match.startAt,
      endsAt: match.endAt,
      allDay: false,
      presentation,
      teamId: match.teamId,
      teamSeasonId: match.teamSeasonId,
      orgUnitId: null,
      status,
      navigationTarget:
        buildSportingActivityDetailHref("MATCH", domainId) ??
        navigationTargetForKind("MATCH", domainId),
    });
  });

  return items;
}

function tournamentRelevantToTeam(
  tournament: Awaited<ReturnType<typeof listTournaments>>[number],
  teamId: string,
  teamSeasonId: string,
): boolean {
  if (tournament.teamSeasonId === teamSeasonId) return true;
  if (tournament.team?.id === teamId) return true;
  const participating = getTournamentParticipatingTeams(tournament);
  return participating.some((team) => team.id === teamId);
}

async function loadTournamentProgrammeItems(
  ctx: LoadContext,
  scope: ProgrammeScope,
): Promise<ProgrammeItem[]> {
  const tournaments = await listTournaments(ctx.tenantId, {
    overlapsWindow: { from: ctx.rangeStart, to: ctx.rangeEnd },
  });

  const filtered =
    scope.kind === "TEAM"
      ? tournaments.filter((t) =>
          tournamentRelevantToTeam(t, scope.teamId, scope.teamSeasonId),
        )
      : tournaments;

  const items: ProgrammeItem[] = [];

  for (const tournament of filtered) {
    if (
      !canIncludeEventInPersonalProjection(ctx.actor, {
        id: tournament.id,
        tenantId: ctx.tenantId,
        teamId: tournament.team?.id ?? null,
        type: "TOURNAMENT",
        status: tournament.status,
        reviewStage: tournament.reviewStage as ReviewWorkflowStage,
      })
    ) {
      continue;
    }

    const presentation = resolveSceTournamentPresentation({
      tournament,
      tenantClubName: ctx.tenantClubName,
    });

    const status = normalizeEventProgrammeStatus(tournament.status);
    const domainId = tournament.id;
    const resourceKey = buildProgrammeResourceKey("TOURNAMENT", domainId);

    items.push({
      id: buildProgrammeItemId("TOURNAMENT", domainId),
      kind: "TOURNAMENT",
      domainId,
      resourceKey,
      startsAt: new Date(tournament.startAt),
      endsAt: tournament.endAt ? new Date(tournament.endAt) : null,
      allDay: false,
      presentation,
      teamId: tournament.team?.id ?? null,
      teamSeasonId: tournament.teamSeasonId ?? null,
      orgUnitId: null,
      status,
      navigationTarget:
        buildSportingActivityDetailHref("TOURNAMENT", domainId) ??
        navigationTargetForKind("TOURNAMENT", domainId),
    });
  }

  return items;
}

async function loadClubEventProgrammeItems(
  ctx: LoadContext,
  scope: ProgrammeScope,
): Promise<ProgrammeItem[]> {
  const events = await prisma.event.findMany({
    where: {
      tenantId: ctx.tenantId,
      type: "OTHER",
      startAt: { gte: ctx.rangeStart, lte: ctx.rangeEnd },
      ...clubEventManagementVisibilityWhere(true),
    },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      tenantId: true,
      teamId: true,
      teamSeasonId: true,
      title: true,
      status: true,
      reviewStage: true,
      startAt: true,
      endAt: true,
      allDay: true,
      location: true,
      organizerName: true,
      clubEventOrganisationalScope: true,
      clubEventOrganisationalAudienceTeams: { select: { teamId: true } },
      clubEventOrganisationalAudienceOrgUnits: { select: { orgUnitId: true } },
      team: { select: { id: true, orgUnitId: true, name: true } },
    },
  });

  const teamOrgUnitByTeamId = new Map<string, string | null>();
  if (scope.kind === "CLUB") {
    const teams = await prisma.team.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, orgUnitId: true },
    });
    for (const team of teams) {
      teamOrgUnitByTeamId.set(team.id, team.orgUnitId);
    }
  }

  const items: ProgrammeItem[] = [];

  for (const event of events) {
    if (
      !canIncludeEventInPersonalProjection(ctx.actor, {
        id: event.id,
        tenantId: event.tenantId,
        teamId: event.teamId,
        type: "OTHER",
        status: event.status,
        reviewStage: event.reviewStage,
      })
    ) {
      continue;
    }

    const audience = clubEventAudienceFromRow(event);

    if (scope.kind === "TEAM") {
      if (
        !isClubEventRelevantToTeamProgrammeContext(audience, {
          teamId: scope.teamId,
          orgUnitId: scope.orgUnitId,
        })
      ) {
        continue;
      }
    }

    const legacyPresentation = buildGenericSportingEventPresentation({
      resourceKey: buildProgrammeResourceKey("CLUB_EVENT", event.id),
      title: event.title,
      typeLabel: "Veranstaltung",
      teamName: event.team?.name ?? undefined,
      location: event.location,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: event.allDay,
      status: normalizeEventProgrammeStatus(event.status),
      eventType: "OTHER",
    });

    const presentation = resolveSceClubEventPresentationFromLegacy(legacyPresentation, {
      organiserDisplayName: event.organizerName ?? ctx.tenantClubName,
    });

    const status = normalizeEventProgrammeStatus(event.status);
    const domainId = event.id;
    const resourceKey = buildProgrammeResourceKey("CLUB_EVENT", domainId);

    const primaryTeamId = audience.teamIds[0] ?? event.teamId ?? null;
    const orgUnitId =
      primaryTeamId != null
        ? (teamOrgUnitByTeamId.get(primaryTeamId) ?? event.team?.orgUnitId ?? null)
        : (audience.orgUnitIds[0] ?? event.team?.orgUnitId ?? null);

    items.push({
      id: buildProgrammeItemId("CLUB_EVENT", domainId),
      kind: "CLUB_EVENT",
      domainId,
      resourceKey,
      startsAt: event.startAt,
      endsAt: event.endAt,
      allDay: event.allDay,
      presentation,
      teamId: primaryTeamId,
      teamSeasonId: event.teamSeasonId,
      orgUnitId,
      status,
      navigationTarget: navigationTargetForKind("CLUB_EVENT", domainId),
    });
  }

  return items;
}

export async function loadProgrammeSourceItems(
  scope: ProgrammeScope,
  ctx: LoadContext,
): Promise<ProgrammeItem[]> {
  const [training, matches, tournaments, clubEvents] = await Promise.all([
    loadTrainingProgrammeItems(ctx, scope),
    loadMatchProgrammeItems(ctx, scope),
    loadTournamentProgrammeItems(ctx, scope),
    loadClubEventProgrammeItems(ctx, scope),
  ]);

  return [...training, ...matches, ...tournaments, ...clubEvents];
}
