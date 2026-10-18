/**
 * SCE-TOURNAMENT-PLANNER-01H — persist optimised / regenerated schedules (application boundary).
 */

import { prisma } from "@/lib/db/prisma";
import { requireTenantOrganisedTournament } from "./internal/require-tenant-organised-tournament";
import {
  listTournamentFixtureAssignmentsForVersion,
  persistTournamentFixtureAssignment,
  updateTournamentFixtureAssignment,
} from "./assignment-service";
import { loadTournamentScheduleOptimisationContext } from "./feasibility-service";
import { listTournamentScheduleEngineFixtures } from "./schedule-engine-load-service";
import { optimiseTournamentSchedule } from "./schedule-optimiser/optimise";
import { recordPlanungOptimiserInvocation } from "@/lib/tournaments/planung/planung-load-telemetry";
import type { TournamentScheduleOptimisationResult } from "./schedule-optimiser/types";
import { runTournamentPartialRegenerationForVersion } from "./partial-regeneration-service";
import {
  createWorkingTournamentScheduleVersion,
  getTournamentScheduleVersion,
  updateWorkingTournamentScheduleVersionTiming,
} from "./schedule-version-service";
import { assessTournamentTiming } from "./smart-timing";
import { resolvePlanungRecommendedTimingFromAssessment } from "@/lib/tournaments/planung/planung-presentation";
import {
  TournamentScheduleResourceInvalidError,
  TournamentSchedulingError,
} from "./errors";

export class TournamentPlanungIncompleteError extends TournamentSchedulingError {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(
      "TOURNAMENT_GENERATION_INVALID",
      `Turnierplanung unvollständig: ${missing.join(", ")}`,
    );
    this.name = "TournamentPlanungIncompleteError";
    this.missing = missing;
  }
}

export async function getOrCreateWorkingTournamentScheduleVersion(
  tenantId: string,
  tournamentId: string,
): Promise<{ id: string; revision: number }> {
  await requireTenantOrganisedTournament(tenantId, tournamentId);
  const existing = await prisma.tournamentScheduleVersion.findFirst({
    where: { tenantId, eventId: tournamentId, status: "WORKING" },
    select: { id: true, revision: true },
  });
  if (existing) return existing;
  const created = await createWorkingTournamentScheduleVersion(tenantId, tournamentId);
  return { id: created.id, revision: created.revision };
}

async function assertPlanungGenerationReadiness(
  tenantId: string,
  tournamentId: string,
): Promise<void> {
  const missing: string[] = [];
  const [event, participantCount, pitchCount, fixtureCount] = await Promise.all([
    prisma.event.findFirstOrThrow({
      where: { id: tournamentId, tenantId, type: "TOURNAMENT" },
      select: { startAt: true, endAt: true },
    }),
    prisma.tournamentParticipant.count({ where: { tenantId, eventId: tournamentId } }),
    prisma.tournamentPitch.count({ where: { tenantId, eventId: tournamentId } }),
    prisma.tournamentFixture.count({ where: { tenantId, eventId: tournamentId } }),
  ]);

  if (!event.startAt || !event.endAt) {
    missing.push("Zeitfenster");
  }
  if (participantCount < 2) {
    missing.push("Teilnehmer");
  }
  if (pitchCount < 1) {
    missing.push("Turnierfelder");
  }
  if (fixtureCount < 1) {
    missing.push("Spiele");
  }

  if (missing.length > 0) {
    throw new TournamentPlanungIncompleteError(missing);
  }
}

export async function syncOptimisedAssignmentsToVersion(params: {
  tenantId: string;
  scheduleVersionId: string;
  optimisation: TournamentScheduleOptimisationResult;
  expectedRevision?: number;
}): Promise<{ revision: number }> {
  const version = await getTournamentScheduleVersion(params.tenantId, params.scheduleVersionId);
  let expectedRevision = params.expectedRevision ?? version.revision;

  const existing = await listTournamentFixtureAssignmentsForVersion(
    params.tenantId,
    params.scheduleVersionId,
  );
  const existingByFixture = new Map(existing.map((a) => [a.fixtureId, a]));

  for (const assignment of params.optimisation.assignments) {
    const startAt = new Date(assignment.startUtcMs);
    const endAt = new Date(assignment.resourceEndUtcMs);
    const row = existingByFixture.get(assignment.fixtureId);
    if (row) {
      const updated = await updateTournamentFixtureAssignment(
        params.tenantId,
        row.id,
        {
          tournamentPitchId: assignment.tournamentPitchId,
          startAt,
          endAt,
        },
        { expectedRevision },
      );
      expectedRevision = updated.revision;
      existingByFixture.delete(assignment.fixtureId);
    } else {
      const created = await persistTournamentFixtureAssignment(
        params.tenantId,
        params.scheduleVersionId,
        {
          fixtureId: assignment.fixtureId,
          tournamentPitchId: assignment.tournamentPitchId,
          startAt,
          endAt,
        },
        { expectedRevision },
      );
      expectedRevision = created.revision;
    }
  }

  return { revision: expectedRevision };
}

export async function applyCanonicalPlanungRecommendedTiming(params: {
  tenantId: string;
  tournamentId: string;
  expectedRevision?: number;
}): Promise<{ scheduleVersionId: string; revision: number }> {
  await requireTenantOrganisedTournament(params.tenantId, params.tournamentId);
  await assertPlanungGenerationReadiness(params.tenantId, params.tournamentId);

  const working = await getOrCreateWorkingTournamentScheduleVersion(
    params.tenantId,
    params.tournamentId,
  );
  if (
    params.expectedRevision !== undefined &&
    params.expectedRevision !== working.revision
  ) {
    throw new TournamentSchedulingError(
      "SCHEDULE.STALE_VERSION",
      `Schedule revision mismatch: expected ${params.expectedRevision}, actual ${working.revision}`,
    );
  }

  const loaded = await loadTournamentScheduleOptimisationContext(
    params.tenantId,
    params.tournamentId,
    working.id,
  );
  const fixtures = await listTournamentScheduleEngineFixtures(
    params.tenantId,
    params.tournamentId,
  );

  const assessment = assessTournamentTiming({
    mode: "FIXED_ASSESSMENT",
    tournamentWindow: loaded.tournamentWindow,
    config: {
      matchDurationMinutes: loaded.schedulingConfig.matchDurationMinutes,
      transitionMinutes: loaded.schedulingConfig.transitionMinutes,
      minRestMinutes: loaded.schedulingConfig.minRestMinutes,
    },
    fixtures,
    participants: loaded.participants,
    tournamentPitches: loaded.tournamentPitches.map((p) => ({
      tournamentPitchId: p.tournamentPitchId,
      displayOrder: p.displayOrder,
      label: p.label,
    })),
    breaks: loaded.breaks,
  });

  const recommended = resolvePlanungRecommendedTimingFromAssessment(assessment, {
    matchDurationMinutes: loaded.schedulingConfig.matchDurationMinutes,
    transitionMinutes: loaded.schedulingConfig.transitionMinutes,
  });
  if (!recommended) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_GENERATION_INVALID",
      "Es liegt keine übernehmbare Smart-Timing-Empfehlung vor.",
    );
  }

  const updated = await updateWorkingTournamentScheduleVersionTiming(
    params.tenantId,
    working.id,
    {
      matchDurationMinutes: recommended.matchDurationMinutes,
      transitionMinutes: recommended.transitionMinutes,
    },
    { expectedRevision: working.revision },
  );

  return { scheduleVersionId: updated.id, revision: updated.revision };
}

export async function runInitialTournamentScheduleGeneration(params: {
  tenantId: string;
  tournamentId: string;
  expectedRevision?: number;
}): Promise<{
  optimisation: TournamentScheduleOptimisationResult;
  scheduleVersionId: string;
  revision: number;
}> {
  await requireTenantOrganisedTournament(params.tenantId, params.tournamentId);
  await assertPlanungGenerationReadiness(params.tenantId, params.tournamentId);

  const working = await getOrCreateWorkingTournamentScheduleVersion(
    params.tenantId,
    params.tournamentId,
  );
  if (
    params.expectedRevision !== undefined &&
    params.expectedRevision !== working.revision
  ) {
    throw new TournamentSchedulingError(
      "SCHEDULE.STALE_VERSION",
      `Schedule revision mismatch: expected ${params.expectedRevision}, actual ${working.revision}`,
    );
  }

  const [loaded, fixtures] = await Promise.all([
    loadTournamentScheduleOptimisationContext(
      params.tenantId,
      params.tournamentId,
      working.id,
    ),
    listTournamentScheduleEngineFixtures(params.tenantId, params.tournamentId),
  ]);

  if (fixtures.length === 0) {
    throw new TournamentPlanungIncompleteError(["Spiele"]);
  }

  recordPlanungOptimiserInvocation();
  const optimisation = optimiseTournamentSchedule({
    tournamentWindow: loaded.tournamentWindow,
    config: {
      matchDurationMinutes: loaded.schedulingConfig.matchDurationMinutes,
      transitionMinutes: loaded.schedulingConfig.transitionMinutes,
      minRestMinutes: loaded.schedulingConfig.minRestMinutes,
    },
    fixtures,
    participants: loaded.participants,
    tournamentPitches: loaded.tournamentPitches.map((p) => ({
      tournamentPitchId: p.tournamentPitchId,
      displayOrder: p.displayOrder,
      label: p.label,
    })),
    breaks: loaded.breaks,
  });

  if (
    optimisation.status === "INFEASIBLE_PROVEN" ||
    optimisation.assignments.length === 0
  ) {
    return {
      optimisation,
      scheduleVersionId: working.id,
      revision: working.revision,
    };
  }

  const synced = await syncOptimisedAssignmentsToVersion({
    tenantId: params.tenantId,
    scheduleVersionId: working.id,
    optimisation,
    expectedRevision: working.revision,
  });

  return {
    optimisation,
    scheduleVersionId: working.id,
    revision: synced.revision,
  };
}

export async function runTournamentScheduleRegeneration(params: {
  tenantId: string;
  tournamentId: string;
  scheduleVersionId: string;
  expectedRevision?: number;
}): Promise<{
  regeneration: Awaited<ReturnType<typeof runTournamentPartialRegenerationForVersion>>;
  revision: number;
}> {
  await requireTenantOrganisedTournament(params.tenantId, params.tournamentId);

  const version = await getTournamentScheduleVersion(params.tenantId, params.scheduleVersionId);
  if (version.eventId !== params.tournamentId) {
    throw new TournamentScheduleResourceInvalidError(
      "Schedule version does not belong to tournament",
    );
  }

  if (params.expectedRevision !== undefined && params.expectedRevision !== version.revision) {
    throw new TournamentSchedulingError(
      "SCHEDULE.STALE_VERSION",
      `Schedule revision mismatch: expected ${params.expectedRevision}, actual ${version.revision}`,
    );
  }

  const regeneration = await runTournamentPartialRegenerationForVersion({
    tenantId: params.tenantId,
    tournamentId: params.tournamentId,
    scheduleVersionId: params.scheduleVersionId,
  });

  if (regeneration.lockConflictDiagnostics.length > 0) {
    return { regeneration, revision: version.revision };
  }

  if (
    regeneration.status === "INFEASIBLE_PROVEN" ||
    regeneration.assignments.length === 0
  ) {
    return { regeneration, revision: version.revision };
  }

  const synced = await syncOptimisedAssignmentsToVersion({
    tenantId: params.tenantId,
    scheduleVersionId: params.scheduleVersionId,
    optimisation: regeneration,
    expectedRevision: version.revision,
  });

  return { regeneration, revision: synced.revision };
}
