/**
 * Pure validation for a single manual assignment move (01I).
 * Reuses 01D hard constraints + 01F2 dependency semantics — no parallel conflict engine.
 */

import { buildBlockedIntervalsByPitchId, slotOverlapsPitchBreak } from "../feasibility/break-intervals";
import {
  canPlaceFixtureOnSlot,
  slotWithinTournamentWindow,
} from "../feasibility/constraints";
import {
  applyFeasibilitySlot,
  createFeasibilitySearchState,
} from "../feasibility/complete-search";
import type { FeasibilityCandidateSlot } from "../feasibility/types";
import { satisfiesScheduleDependencies } from "../schedule-optimiser/dependencies";
import type { ScheduleLockConflictDiagnostic } from "../schedule-lock/types";
import { scheduleAssignmentFromStart } from "./assignment-intervals";
import type {
  TournamentManualAssignmentValidationContext,
  TournamentManualAssignmentValidationResult,
} from "./types";

function diag(
  category: ScheduleLockConflictDiagnostic["category"],
  fixtureIds: string[],
  message: string,
  context?: Record<string, unknown>,
): ScheduleLockConflictDiagnostic {
  return { category, fixtureIds, message, context };
}

function pitchOverlapDiagnostic(
  fixtureId: string,
  tournamentPitchId: string,
): ScheduleLockConflictDiagnostic {
  return diag("PITCH_OVERLAP", [fixtureId], "Pitch overlap", { tournamentPitchId });
}

function validateLockAllowsMove(ctx: TournamentManualAssignmentValidationContext): ScheduleLockConflictDiagnostic | null {
  const current = ctx.assignments.find((a) => a.fixtureId === ctx.movingFixtureId);
  if (!current) {
    return diag("UNKNOWN_FIXTURE", [ctx.movingFixtureId], "Fixture is not scheduled");
  }
  const lock = ctx.lockDimension;
  if (lock === "TIME_AND_PITCH") {
    return diag(
      "SCHEDULE_LOCK_VIOLATION",
      [ctx.movingFixtureId],
      "Zeit und Feld sind gesperrt — manuelle Verschiebung nicht möglich.",
    );
  }
  if (lock === "TIME" && ctx.targetStartUtcMs !== current.startUtcMs) {
    return diag(
      "SCHEDULE_LOCK_VIOLATION",
      [ctx.movingFixtureId],
      "Die Zeit ist gesperrt — nur ein anderes Feld ist erlaubt.",
    );
  }
  if (lock === "PITCH" && ctx.targetTournamentPitchId !== current.tournamentPitchId) {
    return diag(
      "SCHEDULE_LOCK_VIOLATION",
      [ctx.movingFixtureId],
      "Das Feld ist gesperrt — nur eine andere Uhrzeit ist erlaubt.",
    );
  }
  return null;
}

function validateDependentsStillSatisfied(params: {
  ctx: TournamentManualAssignmentValidationContext;
  movedSlot: FeasibilityCandidateSlot;
  stateAfterMove: ReturnType<typeof createFeasibilitySearchState>;
}): ScheduleLockConflictDiagnostic | null {
  const { ctx, movedSlot, stateAfterMove } = params;
  for (const assignment of ctx.assignments) {
    if (assignment.fixtureId === ctx.movingFixtureId) continue;
    const deps = ctx.dependencies.get(assignment.fixtureId) ?? [];
    for (const dep of deps) {
      if (dep.kind === "AFTER_FIXTURE_COMPLETE" && dep.sourceFixtureId === ctx.movingFixtureId) {
        const dependentSlot = stateAfterMove.assignments.get(assignment.fixtureId);
        if (dependentSlot && dependentSlot.startUtcMs < movedSlot.resourceEndUtcMs) {
          return diag(
            "QUALIFICATION_DEPENDENCY",
            [assignment.fixtureId, ctx.movingFixtureId],
            "Dependent fixture would start before prerequisite completes",
          );
        }
      }
    }
  }
  return null;
}

export function validateTournamentManualAssignment(
  ctx: TournamentManualAssignmentValidationContext,
): TournamentManualAssignmentValidationResult {
  const fixture = ctx.fixtures.find((f) => f.fixtureId === ctx.movingFixtureId);
  if (!fixture) {
    return {
      ok: false,
      diagnostics: [diag("UNKNOWN_FIXTURE", [ctx.movingFixtureId], "Unknown fixture")],
    };
  }

  const pitchIds = new Set(ctx.pitches.map((p) => p.tournamentPitchId));
  if (!pitchIds.has(ctx.targetTournamentPitchId)) {
    return {
      ok: false,
      diagnostics: [
        diag(
          "INVALID_TOURNAMENT_PITCH",
          [ctx.movingFixtureId],
          "Invalid tournament pitch",
          { tournamentPitchId: ctx.targetTournamentPitchId },
        ),
      ],
    };
  }

  const lockDiag = validateLockAllowsMove(ctx);
  if (lockDiag) {
    return { ok: false, diagnostics: [lockDiag] };
  }

  const current = ctx.assignments.find((a) => a.fixtureId === ctx.movingFixtureId);
  if (
    current &&
    current.startUtcMs === ctx.targetStartUtcMs &&
    current.tournamentPitchId === ctx.targetTournamentPitchId
  ) {
    return { ok: true, slot: current };
  }

  const proposed = scheduleAssignmentFromStart({
    fixtureId: ctx.movingFixtureId,
    tournamentPitchId: ctx.targetTournamentPitchId,
    startUtcMs: ctx.targetStartUtcMs,
    config: ctx.config,
  });

  const slot: FeasibilityCandidateSlot = {
    slotIndex: -1,
    tournamentPitchId: proposed.tournamentPitchId,
    startUtcMs: proposed.startUtcMs,
    resourceEndUtcMs: proposed.resourceEndUtcMs,
    participantEndUtcMs: proposed.endUtcMs,
  };

  if (
    !slotWithinTournamentWindow(
      ctx.tournamentWindow.startUtcMs,
      ctx.tournamentWindow.endUtcMs,
      slot,
    )
  ) {
    return {
      ok: false,
      diagnostics: [
        diag(
          "OUTSIDE_TOURNAMENT_WINDOW",
          [ctx.movingFixtureId],
          "Outside tournament window",
        ),
      ],
    };
  }

  const blockedIntervalsByPitchId = buildBlockedIntervalsByPitchId({
    breaks: ctx.breaks,
    pitches: ctx.pitches,
    tournamentWindow: ctx.tournamentWindow,
  });
  if (slotOverlapsPitchBreak(slot, blockedIntervalsByPitchId)) {
    return {
      ok: false,
      diagnostics: [
        diag("BREAK_CONFLICT", [ctx.movingFixtureId], "Break conflict", {
          tournamentPitchId: ctx.targetTournamentPitchId,
        }),
      ],
    };
  }

  const state = createFeasibilitySearchState();
  const others = [...ctx.assignments]
    .filter((a) => a.fixtureId !== ctx.movingFixtureId)
    .sort((a, b) => a.startUtcMs - b.startUtcMs || a.fixtureId.localeCompare(b.fixtureId));

  for (const assignment of others) {
    const otherFixture = ctx.fixtures.find((f) => f.fixtureId === assignment.fixtureId);
    if (!otherFixture) continue;
    const otherSlot: FeasibilityCandidateSlot = {
      slotIndex: -1,
      tournamentPitchId: assignment.tournamentPitchId,
      startUtcMs: assignment.startUtcMs,
      resourceEndUtcMs: assignment.resourceEndUtcMs,
      participantEndUtcMs: assignment.endUtcMs,
    };
    applyFeasibilitySlot(state, assignment.fixtureId, [
      otherFixture.sideAParticipantId,
      otherFixture.sideBParticipantId,
    ], otherSlot);
  }

  const participantIds = [fixture.sideAParticipantId, fixture.sideBParticipantId];
  const resourceBookings = state.resourceBookings.get(slot.tournamentPitchId) ?? [];

  if (
    !canPlaceFixtureOnSlot({
      fixtureId: ctx.movingFixtureId,
      participantIds,
      slot,
      config: ctx.config,
      windowStart: ctx.tournamentWindow.startUtcMs,
      windowEnd: ctx.tournamentWindow.endUtcMs,
      resourceBookings,
      participantBookings: state.participantBookings,
      participantLastEnd: state.participantLastEnd,
    })
  ) {
    const restFailed = participantIds.some((pid) => {
      const lastEnd = state.participantLastEnd.get(pid);
      if (lastEnd === undefined) return false;
      const minGapMs = ctx.config.minRestMinutes * 60_000;
      return slot.startUtcMs < lastEnd + minGapMs;
    });
    if (restFailed && ctx.config.minRestMinutes > 0) {
      const offender = participantIds.find((pid) => {
        const lastEnd = state.participantLastEnd.get(pid);
        return lastEnd !== undefined && slot.startUtcMs < lastEnd + ctx.config.minRestMinutes * 60_000;
      });
      return {
        ok: false,
        diagnostics: [
          diag("MINIMUM_REST", [ctx.movingFixtureId], "Minimum rest", {
            participantId: offender,
            participantDisplayName: offender
              ? ctx.participantDisplayNames?.get(offender)
              : undefined,
          }),
        ],
      };
    }

    for (const participantId of participantIds) {
      const bookings = state.participantBookings.get(participantId) ?? [];
      for (const booking of bookings) {
        if (booking.fixtureId === ctx.movingFixtureId) continue;
        if (
          slot.startUtcMs < booking.participantEndUtcMs &&
          booking.startUtcMs < slot.participantEndUtcMs
        ) {
          return {
            ok: false,
            diagnostics: [
              diag("PARTICIPANT_OVERLAP", [ctx.movingFixtureId, booking.fixtureId], "Overlap", {
                participantId,
                participantDisplayName: ctx.participantDisplayNames?.get(participantId),
              }),
            ],
          };
        }
      }
    }

    return {
      ok: false,
      diagnostics: [pitchOverlapDiagnostic(ctx.movingFixtureId, slot.tournamentPitchId)],
    };
  }

  if (
    !satisfiesScheduleDependencies({
      fixtureId: ctx.movingFixtureId,
      slot,
      state,
      dependencies: ctx.dependencies,
    })
  ) {
    return {
      ok: false,
      diagnostics: [
        diag(
          "QUALIFICATION_DEPENDENCY",
          [ctx.movingFixtureId],
          "Qualification dependency",
        ),
      ],
    };
  }

  applyFeasibilitySlot(state, ctx.movingFixtureId, participantIds, slot);

  const dependentViolation = validateDependentsStillSatisfied({
    ctx,
    movedSlot: slot,
    stateAfterMove: state,
  });
  if (dependentViolation) {
    return { ok: false, diagnostics: [dependentViolation] };
  }

  return { ok: true, slot: proposed };
}
