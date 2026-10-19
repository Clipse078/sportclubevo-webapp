import { parseTenantLocalDateTimeInput } from "@/lib/events/tenant-local-datetime";
import { prisma } from "@/lib/db/prisma";
import { listTournamentFixtures } from "@/lib/tournament-scheduling/fixture-service";
import { createTournamentBreak } from "@/lib/tournament-scheduling/tournament-break-service";
import {
  getOrCreateWorkingTournamentScheduleVersion,
  syncOptimisedAssignmentsToVersion,
} from "@/lib/tournament-scheduling/tournament-schedule-orchestration-service";
import type { TournamentScheduleOptimisationResult } from "@/lib/tournament-scheduling/schedule-optimiser/types";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import type { TournamentComposerPlannerDraft } from "./tournament-composer-planner-types";
import { resolveComposerMainPauseUtcWindow } from "./tournament-composer-main-pause";
import { buildTournamentSchedulePreview } from "./tournament-composer-schedule-preview";

/**
 * Persists composer-validated schedule assignments (TP01 / field-only paths).
 * Template programmes are scheduled inside applyProgrammeTemplateToTournament.
 */
export async function syncComposerValidatedScheduleFromDraft(input: {
  tenantId: string;
  tournamentId: string;
  payload: TournamentComposerDraftPayload;
  planner: TournamentComposerPlannerDraft;
  pitchIdByLocalId: ReadonlyMap<string, string>;
  tenantTimeZone: string;
}): Promise<void> {
  const persistedParticipants = await prisma.tournamentParticipant.findMany({
    where: { tenantId: input.tenantId, eventId: input.tournamentId },
    select: { id: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });

  const remappedPayload: TournamentComposerDraftPayload = {
    ...input.payload,
    participants: input.payload.participants.map((participant, index) => ({
      ...participant,
      localId: persistedParticipants[index]?.id ?? participant.localId,
    })),
  };

  const preview = buildTournamentSchedulePreview({
    payload: remappedPayload,
    categoryContext: input.planner.programmeProposalCategoryContext ?? null,
    planner: input.planner,
  });

  if (preview.status !== "OK" || preview.assignmentPlan.length === 0) {
    return;
  }

  const fixtures = await listTournamentFixtures(input.tenantId, input.tournamentId);
  const fixtureIdByKey = new Map(
    fixtures
      .filter((row) => row.generatorKey)
      .map((row) => [row.generatorKey!, row.id] as const),
  );

  const mainPause = input.planner.mainPause;
  const pauseWindow =
    mainPause?.enabled === true
      ? resolveComposerMainPauseUtcWindow({
          mainPause,
          tournamentStartAt: input.payload.startAt,
          tournamentEndAt: input.payload.endAt,
          timeZone: input.tenantTimeZone,
        })
      : null;
  if (pauseWindow) {
    await createTournamentBreak(input.tenantId, input.tournamentId, {
      label: "Pause",
      startAt: new Date(pauseWindow.startUtcMs),
      endAt: new Date(pauseWindow.endUtcMs),
      scope: "ALL_PITCHES",
    });
  }

  const working = await getOrCreateWorkingTournamentScheduleVersion(
    input.tenantId,
    input.tournamentId,
  );

  const assignments = preview.assignmentPlan
    .map((row) => {
      const fixtureId = fixtureIdByKey.get(row.fixtureKey);
      const tournamentPitchId = input.pitchIdByLocalId.get(row.pitchLocalId);
      if (!fixtureId || !tournamentPitchId) return null;
      return {
        fixtureId,
        tournamentPitchId,
        startUtcMs: row.startUtcMs,
        endUtcMs: row.endUtcMs,
        resourceEndUtcMs: row.endUtcMs,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  if (assignments.length === 0) {
    return;
  }

  const optimisation: TournamentScheduleOptimisationResult = {
    status: "OPTIMAL",
    participantRestProofStatus: "UNRESOLVED",
    assignments,
    hardConstraintValidationOk: true,
    objectiveMetrics: null,
    objectiveScore: null,
    feasibilityMetrics: null,
    diagnostics: [],
    baselineObjectiveMetrics: null,
    changeMetrics: null,
    searchStats: {
      candidateSlotCount: assignments.length,
      completeAssignmentsExplored: 1,
      nodesVisited: 1,
    },
    optimalityNote: "Composer schedule preview (02D R5) — deterministic round schedule.",
  };

  await syncOptimisedAssignmentsToVersion({
    tenantId: input.tenantId,
    scheduleVersionId: working.id,
    optimisation,
    removeAssignmentsNotInResult: true,
  });
}
