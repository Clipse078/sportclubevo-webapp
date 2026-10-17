/**
 * Server composition — single Planung payload for Tournament workspace.
 */

import { prisma } from "@/lib/db/prisma";
import { analyseTournamentFeasibilityForTournament } from "@/lib/tournament-scheduling/feasibility-service";
import { listTournamentFixtureAssignmentsForVersion } from "@/lib/tournament-scheduling/assignment-service";
import { listTournamentBreaks } from "@/lib/tournament-scheduling/tournament-break-service";
import { listTournamentPitches } from "@/lib/tournament-scheduling/tournament-pitch-service";
import { assessTournamentTiming } from "@/lib/tournament-scheduling/smart-timing";
import { optimiseTournamentSchedule } from "@/lib/tournament-scheduling/schedule-optimiser/optimise";
import { listTournamentScheduleEngineFixtures } from "@/lib/tournament-scheduling/schedule-engine-load-service";
import { resolveTournamentSchedulingConfig } from "@/lib/tournament-scheduling/feasibility-service";
import {
  resolveTournamentPlannerOwnership,
} from "@/lib/tournament-scheduling/planner-eligibility";
import { buildTournamentPlanungViewModel } from "./build-planung-view-model";
import type { PlanungDomainSnapshot } from "./build-planung-view-model";
import type { TournamentPlanungViewModel } from "./types";
import { resolveTournamentParticipantLogoUrl } from "../club-identity";

export async function loadTournamentPlanungViewModel(params: {
  tenantId: string;
  tournamentId: string;
  timezone: string;
  tenantName: string | null;
  tenantLogoUrl: string | null;
  regenerationMetrics?: PlanungDomainSnapshot["regenerationMetrics"];
}): Promise<TournamentPlanungViewModel> {
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
    throw new Error("Tournament not found");
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

  const [pitches, breaks, fixturesRaw, participantRows, schedulingConfig] = await Promise.all([
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
        phase: { select: { label: true } },
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
    resolveTournamentSchedulingConfig(
      params.tenantId,
      workingVersion?.id ?? null,
    ),
  ]);

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

  let feasibility = null;
  let smartTiming = null;
  let optimisation = null;

  if (ownership === "TENANT_ORGANISED" && event.startAt && event.endAt && fixtures.length > 0) {
    const feasibilityLoad = await analyseTournamentFeasibilityForTournament({
      tenantId: params.tenantId,
      tournamentId: params.tournamentId,
      scheduleVersionId: workingVersion?.id ?? null,
    });
    feasibility = feasibilityLoad.feasibility;

    const engineFixtures = await listTournamentScheduleEngineFixtures(
      params.tenantId,
      params.tournamentId,
    );

    smartTiming = assessTournamentTiming({
      mode: "FIXED_ASSESSMENT",
      tournamentWindow: feasibilityLoad.tournamentWindow,
      config: {
        matchDurationMinutes: schedulingConfig.matchDurationMinutes,
        transitionMinutes: schedulingConfig.transitionMinutes,
        minRestMinutes: schedulingConfig.minRestMinutes,
      },
      fixtures: engineFixtures,
      participants: participantRows.map((p) => ({ participantId: p.id })),
      tournamentPitches: pitches.map((p) => ({
        tournamentPitchId: p.id,
        displayOrder: p.displayOrder,
        label: p.label,
      })),
      breaks: breaks.map((b) => ({
        breakId: b.id,
        startUtcMs: new Date(b.startAt).getTime(),
        endUtcMs: new Date(b.endAt).getTime(),
        scope: b.scope,
        tournamentPitchIds: [...b.tournamentPitchIds],
      })),
    });

    if (assignments.length > 0) {
      optimisation = optimiseTournamentSchedule({
        tournamentWindow: feasibilityLoad.tournamentWindow,
        config: {
          matchDurationMinutes: schedulingConfig.matchDurationMinutes,
          transitionMinutes: schedulingConfig.transitionMinutes,
          minRestMinutes: schedulingConfig.minRestMinutes,
        },
        fixtures: engineFixtures,
        participants: participantRows.map((p) => ({ participantId: p.id })),
        tournamentPitches: pitches.map((p) => ({
          tournamentPitchId: p.id,
          displayOrder: p.displayOrder,
          label: p.label,
        })),
        breaks: breaks.map((b) => ({
          breakId: b.id,
          label: b.label,
          startUtcMs: new Date(b.startAt).getTime(),
          endUtcMs: new Date(b.endAt).getTime(),
          scope: b.scope,
          tournamentPitchIds: [...b.tournamentPitchIds],
        })),
        baselineAssignments: assignments.map((a) => ({
          fixtureId: a.fixtureId,
          tournamentPitchId: a.tournamentPitchId,
          startUtcMs: new Date(a.startAt).getTime(),
          endUtcMs: new Date(a.endAt).getTime(),
          resourceEndUtcMs: new Date(a.endAt).getTime(),
        })),
      });
    }
  }

  const snapshot: PlanungDomainSnapshot = {
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
    feasibility,
    smartTiming,
    optimisation,
    regenerationMetrics: params.regenerationMetrics,
  };

  return buildTournamentPlanungViewModel(snapshot);
}
