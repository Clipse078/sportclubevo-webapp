/**
 * SCE-TOURNAMENT-PLANNER-01I — manual assignment mutation service boundary.
 */

import { prisma } from "@/lib/db/prisma";
import { canTenantPlanTournament } from "./planner-eligibility";
import {
  listTournamentFixtureAssignmentsForVersion,
  updateTournamentFixtureAssignment,
} from "./assignment-service";
import { loadTournamentScheduleOptimisationContext } from "./feasibility-service";
import { listTournamentScheduleEngineFixtures } from "./schedule-engine-load-service";
import { resolveFixtureDependencies } from "./schedule-optimiser/dependencies";
import { toFeasibilityFixtures } from "./smart-timing/prepare-context";
import {
  TournamentAssignmentNotFoundError,
  TournamentFixtureNotFoundError,
  TournamentManualAssignmentInvalidError,
  TournamentSchedulingError,
} from "./errors";
import { TournamentPlannerNotOwnedError } from "./partial-regeneration-service";
import { resolveEffectiveScheduleLockDimension } from "./schedule-lock/normalize";
import {
  persistedAssignmentToScheduleAssignment,
  primaryManualAssignmentUserMessage,
  validateTournamentManualAssignment,
  type TournamentManualAssignmentInput,
  type TournamentManualAssignmentValidationContext,
} from "./manual-assignment";
import type { TournamentManualAssignmentApplyResult } from "./manual-assignment/types";

type ManualAssignmentParticipantNameRow = {
  id: string;
  displayName: string | null;
  manualLabel: string | null;
  team: { name: string } | null;
  externalClub: { name: string } | null;
  externalTeam: { name: string } | null;
};

/** Mirrors lib/tournaments/participant-service.ts display-name resolution for diagnostics. */
function resolvedParticipantDisplayName(row: ManualAssignmentParticipantNameRow): string {
  const rawDisplayName = row.displayName?.trim() || null;
  if (row.team) return rawDisplayName ?? row.team.name;
  if (row.externalClub) return rawDisplayName ?? row.externalClub.name;
  if (row.externalTeam) return row.externalTeam.name;
  return row.manualLabel ?? "Unbenannt";
}

async function assertPlannerOwnership(tenantId: string, tournamentId: string): Promise<void> {
  const event = await prisma.event.findFirst({
    where: { id: tournamentId, tenantId, type: "TOURNAMENT" },
    select: { id: true, homeAway: true, organizerName: true, tenant: { select: { name: true } } },
  });
  if (!event) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_SCHEDULE_NOT_FOUND",
      `Tournament not found: ${tournamentId}`,
    );
  }
  if (
    !canTenantPlanTournament({
      homeAway: event.homeAway,
      organizerName: event.organizerName,
      tenantName: event.tenant?.name ?? null,
    })
  ) {
    throw new TournamentPlannerNotOwnedError(tournamentId);
  }
}

export async function buildManualAssignmentValidationContext(
  input: TournamentManualAssignmentInput,
): Promise<TournamentManualAssignmentValidationContext> {
  await assertPlannerOwnership(input.tenantId, input.tournamentId);

  const version = await prisma.tournamentScheduleVersion.findFirst({
    where: { id: input.scheduleVersionId, tenantId: input.tenantId, eventId: input.tournamentId },
    select: { id: true },
  });
  if (!version) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_SCHEDULE_NOT_FOUND",
      `Schedule version not found: ${input.scheduleVersionId}`,
    );
  }

  const assignment = await prisma.tournamentFixtureAssignment.findFirst({
    where: {
      tenantId: input.tenantId,
      scheduleVersionId: input.scheduleVersionId,
      fixtureId: input.fixtureId,
    },
    select: {
      id: true,
      fixtureId: true,
      tournamentPitchId: true,
      startAt: true,
      scheduleLockDimension: true,
      isLocked: true,
    },
  });
  if (!assignment) {
    throw new TournamentAssignmentNotFoundError(`${input.fixtureId}@${input.scheduleVersionId}`);
  }

  const fixture = await prisma.tournamentFixture.findFirst({
    where: { id: input.fixtureId, tenantId: input.tenantId, eventId: input.tournamentId },
    select: { id: true },
  });
  if (!fixture) {
    throw new TournamentFixtureNotFoundError(input.fixtureId);
  }

  const pitch = await prisma.tournamentPitch.findFirst({
    where: {
      id: input.targetTournamentPitchId,
      tenantId: input.tenantId,
      eventId: input.tournamentId,
    },
    select: { id: true, label: true },
  });
  if (!pitch) {
    throw new TournamentManualAssignmentInvalidError(
      [
        {
          category: "INVALID_TOURNAMENT_PITCH",
          fixtureIds: [input.fixtureId],
          message: "Invalid tournament pitch",
          context: { tournamentPitchId: input.targetTournamentPitchId },
        },
      ],
      primaryManualAssignmentUserMessage([
        {
          category: "INVALID_TOURNAMENT_PITCH",
          fixtureIds: [input.fixtureId],
          message: "Invalid tournament pitch",
          context: { tournamentPitchId: input.targetTournamentPitchId },
        },
      ]),
    );
  }

  const [loaded, engineFixtures, assignments, participants] = await Promise.all([
    loadTournamentScheduleOptimisationContext(
      input.tenantId,
      input.tournamentId,
      input.scheduleVersionId,
    ),
    listTournamentScheduleEngineFixtures(input.tenantId, input.tournamentId),
    listTournamentFixtureAssignmentsForVersion(input.tenantId, input.scheduleVersionId),
    prisma.tournamentParticipant.findMany({
      where: { tenantId: input.tenantId, eventId: input.tournamentId },
      select: {
        id: true,
        displayName: true,
        manualLabel: true,
        team: { select: { name: true } },
        externalClub: { select: { name: true } },
        externalTeam: { select: { name: true } },
      },
    }),
  ]);

  const config = {
    matchDurationMinutes: loaded.schedulingConfig.matchDurationMinutes,
    transitionMinutes: loaded.schedulingConfig.transitionMinutes,
    minRestMinutes: loaded.schedulingConfig.minRestMinutes,
  };

  const participantDisplayNames = new Map<string, string>(
    participants.map((p) => [p.id, resolvedParticipantDisplayName(p)]),
  );
  const pitchLabels = new Map(loaded.tournamentPitches.map((p) => [p.tournamentPitchId, p.label]));

  const scheduleAssignments = assignments.map((a) =>
    persistedAssignmentToScheduleAssignment(
      {
        fixtureId: a.fixtureId,
        tournamentPitchId: a.tournamentPitchId,
        startAt: a.startAt,
      },
      config,
    ),
  );

  const lockDimension = resolveEffectiveScheduleLockDimension({
    scheduleLockDimension: assignment.scheduleLockDimension,
    isLocked: assignment.isLocked,
  });

  return {
    tournamentWindow: loaded.tournamentWindow,
    config,
    fixtures: toFeasibilityFixtures(engineFixtures),
    assignments: scheduleAssignments,
    pitches: loaded.tournamentPitches,
    breaks: loaded.breaks,
    dependencies: resolveFixtureDependencies(engineFixtures),
    movingFixtureId: input.fixtureId,
    targetTournamentPitchId: input.targetTournamentPitchId,
    targetStartUtcMs: Date.parse(input.targetStartAt),
    lockDimension,
    participantDisplayNames,
    pitchLabels,
  };
}

export async function validateTournamentManualAssignmentForInput(
  input: TournamentManualAssignmentInput,
) {
  const ctx = await buildManualAssignmentValidationContext(input);
  return validateTournamentManualAssignment(ctx);
}

export async function applyTournamentManualAssignment(
  input: TournamentManualAssignmentInput,
  options?: { timezone?: string },
): Promise<TournamentManualAssignmentApplyResult> {
  const ctx = await buildManualAssignmentValidationContext(input);
  const validation = validateTournamentManualAssignment(ctx);
  if (!validation.ok) {
    throw new TournamentManualAssignmentInvalidError(
      validation.diagnostics,
      primaryManualAssignmentUserMessage(validation.diagnostics, ctx.pitchLabels),
    );
  }

  const current = ctx.assignments.find((a) => a.fixtureId === input.fixtureId)!;
  if (
    current.startUtcMs === validation.slot.startUtcMs &&
    current.tournamentPitchId === validation.slot.tournamentPitchId
  ) {
    const row = await prisma.tournamentFixtureAssignment.findFirstOrThrow({
      where: {
        tenantId: input.tenantId,
        scheduleVersionId: input.scheduleVersionId,
        fixtureId: input.fixtureId,
      },
      select: { id: true, scheduleVersion: { select: { revision: true } } },
    });
    return {
      revision: row.scheduleVersion.revision,
      assignmentId: row.id,
      userMessage: "Keine Änderung",
    };
  }

  const assignmentRow = await prisma.tournamentFixtureAssignment.findFirstOrThrow({
    where: {
      tenantId: input.tenantId,
      scheduleVersionId: input.scheduleVersionId,
      fixtureId: input.fixtureId,
    },
    select: { id: true },
  });

  const pitchLabel = ctx.pitchLabels?.get(validation.slot.tournamentPitchId) ?? "Feld";
  const timeLabel = new Date(validation.slot.startUtcMs).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options?.timezone ?? "Europe/Zurich",
  });

  const { revision } = await updateTournamentFixtureAssignment(
    input.tenantId,
    assignmentRow.id,
    {
      tournamentPitchId: validation.slot.tournamentPitchId,
      startAt: new Date(validation.slot.startUtcMs),
    },
    { expectedRevision: input.expectedRevision },
  );

  return {
    revision,
    assignmentId: assignmentRow.id,
    userMessage: `Spiel verschoben · ${pitchLabel} · ${timeLabel}`,
  };
}
