/**
 * SCE-TOURNAMENT-PLANNER-01G — service boundary: load schedule snapshot, run pure regeneration.
 * Pure engine never writes Prisma; persistence of results remains explicit caller responsibility.
 */

import { prisma } from "@/lib/db/prisma";
import { canTenantPlanTournament } from "./planner-eligibility";
import { TournamentSchedulingError } from "./errors";
import { loadTournamentScheduleOptimisationContext } from "./feasibility-service";
import { listTournamentFixtureAssignmentsForVersion } from "./assignment-service";
import { regenerateTournamentSchedule } from "./partial-regeneration/regenerate";
import { recordPlanungOptimiserInvocation } from "@/lib/tournaments/planung/planung-load-telemetry";
import type { TournamentPartialRegenerationResult } from "./schedule-optimiser/types";
import { scheduleLockFromPersistedAssignment } from "./schedule-lock/normalize";
import type { TournamentFixtureScheduleLock } from "./schedule-lock/types";

export class TournamentPlannerNotOwnedError extends TournamentSchedulingError {
  constructor(tournamentId: string) {
    super(
      "TOURNAMENT_PLANNER_NOT_OWNED_BY_TENANT",
      `Tournament "${tournamentId}" is not tenant-organised — planner regeneration forbidden`,
    );
    this.name = "TournamentPlannerNotOwnedError";
  }
}

export async function runTournamentPartialRegenerationForVersion(params: {
  tenantId: string;
  tournamentId: string;
  scheduleVersionId: string;
  scheduleLocks?: readonly TournamentFixtureScheduleLock[];
}): Promise<TournamentPartialRegenerationResult> {
  const event = await prisma.event.findFirst({
    where: { id: params.tournamentId, tenantId: params.tenantId, type: "TOURNAMENT" },
    select: { id: true, homeAway: true, organizerName: true, tenant: { select: { name: true } } },
  });
  if (!event) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_SCHEDULE_NOT_FOUND",
      `Tournament not found: ${params.tournamentId}`,
    );
  }
  if (
    !canTenantPlanTournament({
      homeAway: event.homeAway,
      organizerName: event.organizerName,
      tenantName: event.tenant?.name ?? null,
    })
  ) {
    throw new TournamentPlannerNotOwnedError(params.tournamentId);
  }

  const [loaded, assignments] = await Promise.all([
    loadTournamentScheduleOptimisationContext(
      params.tenantId,
      params.tournamentId,
      params.scheduleVersionId,
    ),
    listTournamentFixtureAssignmentsForVersion(params.tenantId, params.scheduleVersionId),
  ]);

  const persistedLocks: TournamentFixtureScheduleLock[] = assignments
    .map((a) =>
      scheduleLockFromPersistedAssignment({
        fixtureId: a.fixtureId,
        scheduleLockDimension: a.scheduleLockDimension,
        isLocked: a.isLocked,
      }),
    )
    .filter((lock): lock is TournamentFixtureScheduleLock => lock !== null);

  const mergedLocks = [...persistedLocks, ...(params.scheduleLocks ?? [])];

  recordPlanungOptimiserInvocation();
  return regenerateTournamentSchedule({
    tournamentWindow: loaded.tournamentWindow,
    config: {
      matchDurationMinutes: loaded.schedulingConfig.matchDurationMinutes,
      transitionMinutes: loaded.schedulingConfig.transitionMinutes,
      minRestMinutes: loaded.schedulingConfig.minRestMinutes,
    },
    fixtures: loaded.engineFixtures,
    participants: loaded.participants,
    tournamentPitches: loaded.tournamentPitches.map((p) => ({
      tournamentPitchId: p.tournamentPitchId,
      displayOrder: p.displayOrder,
      label: p.label,
    })),
    breaks: loaded.breaks,
    baselineAssignments: assignments.map((a) => {
      const startUtcMs = new Date(a.startAt).getTime();
      const endUtcMs = new Date(a.endAt).getTime();
      return {
        fixtureId: a.fixtureId,
        tournamentPitchId: a.tournamentPitchId,
        startUtcMs,
        endUtcMs,
        resourceEndUtcMs: endUtcMs,
      };
    }),
    scheduleLocks: mergedLocks,
  });
}
