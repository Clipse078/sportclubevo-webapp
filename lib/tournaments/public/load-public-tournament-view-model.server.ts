/**
 * Public tournament projection loader — no feasibility / Smart Timing / optimiser.
 */

import { prisma } from "@/lib/db/prisma";
import { listTournamentFixtureAssignmentsForVersion } from "@/lib/tournament-scheduling/assignment-service";
import { listTournamentBreaks } from "@/lib/tournament-scheduling/tournament-break-service";
import { listTournamentPitches } from "@/lib/tournament-scheduling/tournament-pitch-service";
import { resolveTournamentSchedulingConfig } from "@/lib/tournament-scheduling/feasibility-service";
import { resolveTournamentPlannerOwnership } from "@/lib/tournament-scheduling/planner-eligibility";
import type { PlanungDomainSnapshot } from "@/lib/tournaments/planung/build-planung-view-model";
import { resolveTournamentParticipantLogoUrl } from "@/lib/tournaments/club-identity";
import { getTournament } from "@/lib/tournaments/tournament-service";
import { assertPublicTournamentEligible } from "./assert-public-tournament-eligible";
import { buildPublicTournamentViewModel } from "./build-public-tournament-view-model";
import type { PublicTournamentViewModel } from "./types";

export class PublicTournamentNotFoundError extends Error {
  constructor() {
    super("Public tournament not found");
    this.name = "PublicTournamentNotFoundError";
  }
}

export async function loadPublicPlanungSnapshot(params: {
  tenantId: string;
  tournamentId: string;
  timezone: string;
  tenantName: string | null;
  tenantLogoUrl: string | null;
}): Promise<PlanungDomainSnapshot> {
  const event = await prisma.event.findFirst({
    where: { id: params.tournamentId, tenantId: params.tenantId, type: "TOURNAMENT" },
    select: {
      id: true,
      homeAway: true,
      organizerName: true,
      startAt: true,
      endAt: true,
    },
  });
  if (!event) {
    throw new PublicTournamentNotFoundError();
  }

  const ownership = resolveTournamentPlannerOwnership({
    homeAway: event.homeAway,
    organizerName: event.organizerName,
    tenantName: params.tenantName,
  });

  const workingVersion = await prisma.tournamentScheduleVersion.findFirst({
    where: { tenantId: params.tenantId, eventId: params.tournamentId, status: "WORKING" },
    select: { id: true, revision: true },
  });

  const [
    pitches,
    breaks,
    fixturesRaw,
    participantRows,
    schedulingConfig,
    fixtureResults,
    groupsRaw,
    rankingConfig,
    competitionConfig,
  ] = await Promise.all([
      listTournamentPitches(params.tenantId, params.tournamentId),
      listTournamentBreaks(params.tenantId, params.tournamentId),
      prisma.tournamentFixture.findMany({
        where: { tenantId: params.tenantId, eventId: params.tournamentId },
        orderBy: [
          { stageKey: "asc" },
          { roundIndex: "asc" },
          { slotIndexInRound: "asc" },
          { id: "asc" },
        ],
        include: {
          phase: { select: { label: true, phaseType: true } },
          group: { select: { label: true } },
          sides: {
            orderBy: { side: "asc" },
            include: {
              qualificationSource: {
                include: {
                  sourceGroup: { select: { label: true } },
                  sourceFixture: {
                    select: { roundIndex: true, slotIndexInRound: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.tournamentParticipant.findMany({
        where: { tenantId: params.tenantId, eventId: params.tournamentId },
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        include: {
          team: { select: { id: true } },
          externalClub: {
            select: {
              id: true,
              name: true,
              shortName: true,
              alternativeName: true,
              logoUrl: true,
            },
          },
          externalTeam: {
            select: {
              name: true,
              shortName: true,
              alternativeName: true,
              logoUrl: true,
              externalClub: {
                select: {
                  name: true,
                  shortName: true,
                  alternativeName: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      }),
      resolveTournamentSchedulingConfig(params.tenantId, workingVersion?.id ?? null),
      prisma.tournamentFixtureResult.findMany({
        where: { tenantId: params.tenantId, fixture: { eventId: params.tournamentId } },
        select: {
          fixtureId: true,
          state: true,
          scoreSideA: true,
          scoreSideB: true,
          winnerParticipantId: true,
          revision: true,
        },
      }),
      prisma.tournamentGroup.findMany({
        where: { tenantId: params.tenantId, eventId: params.tournamentId },
        orderBy: { displayOrder: "asc" },
        include: {
          memberships: { select: { tournamentParticipantId: true } },
        },
      }),
      prisma.tournamentRankingConfiguration.findUnique({
        where: { eventId: params.tournamentId },
      }),
      prisma.tournamentCompetitionConfiguration.findFirst({
        where: { tenantId: params.tenantId, eventId: params.tournamentId },
        select: { fixtureHomeAwayRelevance: true },
      }),
    ]);

  const fixtureHomeAwayRelevance =
    competitionConfig?.fixtureHomeAwayRelevance === "ON" ? "ON" : "OFF";

  const assignments =
    workingVersion != null
      ? await listTournamentFixtureAssignmentsForVersion(params.tenantId, workingVersion.id)
      : [];

  const participants = participantRows.map((row) => {
    const crestUrl = resolveTournamentParticipantLogoUrl(
      {
        team: row.team,
        externalClub: row.externalClub,
        externalTeam: row.externalTeam,
      },
      params.tenantLogoUrl,
    );
    const displayName = row.displayName?.trim() || row.manualLabel?.trim() || "Teilnehmer";
    return {
      participantId: row.id,
      displayName,
      crestUrl,
      accessibleLabel: displayName,
    };
  });

  const fixtures = fixturesRaw.map((f) => ({
    id: f.id,
    stageKey: f.stageKey,
    roundIndex: f.roundIndex,
    slotIndexInRound: f.slotIndexInRound,
    tournamentGroupId: f.tournamentGroupId,
    phaseType: f.phase?.phaseType ?? null,
    sideAParticipantId: f.sideAParticipantId,
    sideBParticipantId: f.sideBParticipantId,
    phaseLabel: f.phase?.label ?? null,
    groupLabel: f.group?.label ?? null,
    sides: f.sides.map((s) => ({
      side: s.side,
      sourceType: s.sourceType,
      participantId: s.participantId,
      qualification: s.qualificationSource
        ? {
            sourceType: s.qualificationSource.sourceType,
            rank: s.qualificationSource.rank,
            sourceGroupLabel: s.qualificationSource.sourceGroup?.label ?? null,
            sourceFixture: s.qualificationSource.sourceFixture
              ? {
                  roundIndex: s.qualificationSource.sourceFixture.roundIndex,
                  slotIndexInRound: s.qualificationSource.sourceFixture.slotIndexInRound,
                }
              : null,
          }
        : null,
    })),
  }));

  return {
    tournamentId: params.tournamentId,
    ownership,
    timezone: params.timezone,
    windowStartUtc: event.startAt?.toISOString() ?? null,
    windowEndUtc: event.endAt?.toISOString() ?? null,
    scheduleVersionId: workingVersion?.id ?? null,
    scheduleRevision: workingVersion?.revision ?? null,
    schedulingConfig: {
      matchDurationMinutes: schedulingConfig.matchDurationMinutes,
      transitionMinutes: schedulingConfig.transitionMinutes,
      minRestMinutes: schedulingConfig.minRestMinutes,
    },
    pitches,
    breaks: breaks.map((b) => ({
      id: b.id,
      label: b.label,
      startAt: b.startAt,
      endAt: b.endAt,
      scope: b.scope,
      tournamentPitchIds: b.tournamentPitchIds,
    })),
    fixtures,
    assignments: assignments.map((a) => ({
      id: a.id,
      fixtureId: a.fixtureId,
      tournamentPitchId: a.tournamentPitchId,
      startAt: a.startAt,
      endAt: a.endAt,
      scheduleLockDimension: a.scheduleLockDimension,
    })),
    participants,
    participantCount: participantRows.length,
    fixtureCount: fixtures.length,
    feasibility: null,
    smartTiming: null,
    optimisation: null,
    fixtureResults: fixtureResults.map((r) => ({
      fixtureId: r.fixtureId,
      state: r.state,
      scoreSideA: r.scoreSideA,
      scoreSideB: r.scoreSideB,
      winnerParticipantId: r.winnerParticipantId,
      revision: r.revision,
    })),
    groups: groupsRaw.map((g) => ({
      id: g.id,
      label: g.label,
      participantIds: g.memberships.map((m) => m.tournamentParticipantId),
    })),
    rankingConfiguration: rankingConfig
      ? {
          winPoints: rankingConfig.winPoints,
          drawPoints: rankingConfig.drawPoints,
          lossPoints: rankingConfig.lossPoints,
          tiebreakOrder: rankingConfig.tiebreakOrder,
        }
      : {
          winPoints: 3,
          drawPoints: 1,
          lossPoints: 0,
          tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"],
        },
    scheduleConsistencyStatus: null,
    fixtureHomeAwayRelevance,
  };
}

export async function loadPublicTournamentViewModel(params: {
  tenantId: string;
  tenantKey: string;
  tournamentId: string;
  timezone: string;
  tenantName: string | null;
  tenantLogoUrl: string | null;
}): Promise<PublicTournamentViewModel> {
  const eventRow = await prisma.event.findFirst({
    where: { id: params.tournamentId, tenantId: params.tenantId, type: "TOURNAMENT" },
    select: {
      id: true,
      tenantId: true,
      type: true,
      status: true,
      reviewStage: true,
      websiteVisible: true,
      infoboardVisible: true,
      trainingsplanVisible: true,
      wochenplanVisible: true,
      homepageVisible: true,
      teamPageVisible: true,
      homeAway: true,
    },
  });

  if (!eventRow) {
    throw new PublicTournamentNotFoundError();
  }

  const eligibility = assertPublicTournamentEligible({
    tenantId: params.tenantId,
    event: eventRow,
  });
  if (!eligibility.eligible) {
    throw new PublicTournamentNotFoundError();
  }

  const [tournamentDto, snapshot] = await Promise.all([
    getTournament(params.tenantId, params.tournamentId),
    loadPublicPlanungSnapshot(params),
  ]);

  return buildPublicTournamentViewModel({
    tenantKey: params.tenantKey,
    header: {
      id: tournamentDto.id,
      title: tournamentDto.title,
      description: tournamentDto.description,
      location: tournamentDto.location,
      startAt: tournamentDto.startAt,
      endAt: tournamentDto.endAt,
      meetingTime: tournamentDto.meetingTime,
      organizerName: tournamentDto.organizerName,
      organizerLogoUrl: tournamentDto.organizerLogoUrl,
      competitionLabel: tournamentDto.competitionLabel,
      status: tournamentDto.status,
      season: tournamentDto.season
        ? { key: tournamentDto.season.key, name: tournamentDto.season.name }
        : null,
    },
    publication: {
      websiteVisible: tournamentDto.visibility.websiteVisible,
      homepageVisible: tournamentDto.visibility.homepageVisible,
      wochenplanVisible: tournamentDto.visibility.wochenplanVisible,
      teamPageVisible: tournamentDto.visibility.teamPageVisible,
    },
    snapshot,
  });
}
