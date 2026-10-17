import type { FeasibilityCandidateSlot, FeasibilitySchedulingConfig } from "../feasibility/types";
import type { FeasibilityInstantWindow } from "../feasibility/types";
import { slotWithinTournamentWindow } from "../feasibility/constraints";
import type { ResolvedFixtureScheduleLock } from "./normalize";
import type { ScheduleLockConflictDiagnostic, ScheduleLockValidationResult } from "./types";
import {
  type ResolvedFixtureDependency,
  satisfiesScheduleDependencies,
} from "../schedule-optimiser/dependencies";
import type { FeasibilitySearchState } from "../feasibility/complete-search";
import { applyFeasibilitySlot, createFeasibilitySearchState } from "../feasibility/complete-search";
import { canPlaceFixtureOnSlot } from "../feasibility/constraints";
import type { FeasibilityFixtureRef } from "../feasibility/types";
import { slotOverlapsPitchBreak } from "../feasibility/break-intervals";

function ms(minutes: number): number {
  return minutes * 60_000;
}

function diag(
  category: ScheduleLockConflictDiagnostic["category"],
  fixtureIds: string[],
  message: string,
  constraintId?: string,
  context?: Record<string, unknown>,
): ScheduleLockConflictDiagnostic {
  return { category, fixtureIds, message, constraintId, context };
}

export function validateResolvedScheduleLocks(params: {
  resolvedLocks: readonly ResolvedFixtureScheduleLock[];
  fixtures: readonly FeasibilityFixtureRef[];
  pitchIds: ReadonlySet<string>;
  tournamentWindow: FeasibilityInstantWindow;
  config: FeasibilitySchedulingConfig;
  candidateSlots: readonly FeasibilityCandidateSlot[];
  dependencies: Map<string, ResolvedFixtureDependency[]>;
  blockedIntervalsByPitchId: ReadonlyMap<string, readonly FeasibilityInstantWindow[]>;
}): ScheduleLockValidationResult {
  const diagnostics: ScheduleLockConflictDiagnostic[] = [];
  const fixtureById = new Map(params.fixtures.map((f) => [f.fixtureId, f]));
  const slotByKey = new Map<string, FeasibilityCandidateSlot>();
  for (const slot of params.candidateSlots) {
    slotByKey.set(`${slot.tournamentPitchId}\0${slot.startUtcMs}`, slot);
  }
  const matchMs = params.config.matchDurationMinutes * 60_000;

  for (const lock of params.resolvedLocks) {
    const fixture = fixtureById.get(lock.fixtureId);
    if (!fixture) {
      diagnostics.push(
        diag("UNKNOWN_FIXTURE", [lock.fixtureId], "Lock references unknown fixture", "H4"),
      );
      continue;
    }
    if (
      (lock.dimension === "PITCH" || lock.dimension === "TIME_AND_PITCH") &&
      lock.tournamentPitchId &&
      !params.pitchIds.has(lock.tournamentPitchId)
    ) {
      diagnostics.push(
        diag(
          "INVALID_TOURNAMENT_PITCH",
          [lock.fixtureId],
          "Locked TournamentPitch is not part of this tournament",
          "H6",
          { tournamentPitchId: lock.tournamentPitchId },
        ),
      );
    }
    if (lock.startUtcMs !== undefined) {
      const resourceEnd =
        lock.resourceEndUtcMs ?? lock.startUtcMs + matchMs + ms(params.config.transitionMinutes);
      if (
        !slotWithinTournamentWindow(
          params.tournamentWindow.startUtcMs,
          params.tournamentWindow.endUtcMs,
          { startUtcMs: lock.startUtcMs, resourceEndUtcMs: resourceEnd },
        )
      ) {
        diagnostics.push(
          diag(
            "OUTSIDE_TOURNAMENT_WINDOW",
            [lock.fixtureId],
            "Locked interval falls outside tournament window",
            "H5",
          ),
        );
      }
    }
    if (
      lock.dimension === "TIME_AND_PITCH" &&
      lock.tournamentPitchId &&
      lock.startUtcMs !== undefined
    ) {
      const slot = slotByKey.get(`${lock.tournamentPitchId}\0${lock.startUtcMs}`);
      if (!slot) {
        diagnostics.push(
          diag(
            "BREAK_CONFLICT",
            [lock.fixtureId],
            "Locked slot is not a valid candidate (break or grid)",
            "H10",
          ),
        );
      } else if (slotOverlapsPitchBreak(slot, params.blockedIntervalsByPitchId)) {
        diagnostics.push(
          diag("BREAK_CONFLICT", [lock.fixtureId], "Locked fixture overlaps a break", "H10"),
        );
      }
    }
  }

  const fullLocks = params.resolvedLocks.filter((l) => l.dimension === "TIME_AND_PITCH");
  for (let i = 0; i < fullLocks.length; i += 1) {
    for (let j = i + 1; j < fullLocks.length; j += 1) {
      const a = fullLocks[i]!;
      const b = fullLocks[j]!;
      if (
        a.tournamentPitchId === b.tournamentPitchId &&
        a.startUtcMs !== undefined &&
        b.startUtcMs !== undefined &&
        intervalsOverlap(
          a.startUtcMs,
          a.resourceEndUtcMs ?? a.startUtcMs + matchMs,
          b.startUtcMs,
          b.resourceEndUtcMs ?? b.startUtcMs + matchMs,
        )
      ) {
        diagnostics.push(
          diag(
            "PITCH_OVERLAP",
            [a.fixtureId, b.fixtureId],
            "Two fully locked fixtures overlap on the same TournamentPitch",
            "H2",
          ),
        );
      }
    }
  }

  const state = buildLockWitnessState({
    resolvedLocks: params.resolvedLocks,
    fixtures: params.fixtures,
    config: params.config,
    candidateSlots: params.candidateSlots,
    tournamentWindow: params.tournamentWindow,
    dependencies: params.dependencies,
    diagnostics,
  });

  if (state) {
    for (const lock of params.resolvedLocks) {
      const fixture = fixtureById.get(lock.fixtureId);
      if (!fixture || lock.startUtcMs === undefined) continue;
      const slot = state.assignments.get(lock.fixtureId);
      if (!slot) continue;
      if (
        !satisfiesScheduleDependencies({
          fixtureId: lock.fixtureId,
          slot,
          state,
          dependencies: params.dependencies,
        })
      ) {
        diagnostics.push(
          diag(
            "QUALIFICATION_DEPENDENCY",
            [lock.fixtureId],
            "Locked fixture violates qualification dependency ordering",
            "H11",
          ),
        );
      }
    }
  }

  return diagnostics.length === 0 ? { ok: true } : { ok: false, diagnostics };
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function buildLockWitnessState(params: {
  resolvedLocks: readonly ResolvedFixtureScheduleLock[];
  fixtures: readonly FeasibilityFixtureRef[];
  config: FeasibilitySchedulingConfig;
  candidateSlots: readonly FeasibilityCandidateSlot[];
  tournamentWindow: FeasibilityInstantWindow;
  dependencies: Map<string, ResolvedFixtureDependency[]>;
  diagnostics: ScheduleLockConflictDiagnostic[];
}): FeasibilitySearchState | null {
  const slotByKey = new Map<string, FeasibilityCandidateSlot>();
  for (const slot of params.candidateSlots) {
    slotByKey.set(`${slot.tournamentPitchId}\0${slot.startUtcMs}`, slot);
  }
  const fixtureById = new Map(params.fixtures.map((f) => [f.fixtureId, f]));
  const state = createFeasibilitySearchState();
  const matchMs = params.config.matchDurationMinutes * 60_000;

  const ordered = [...params.resolvedLocks].sort((a, b) => a.fixtureId.localeCompare(b.fixtureId));
  for (const lock of ordered) {
    const fixture = fixtureById.get(lock.fixtureId);
    if (!fixture || lock.startUtcMs === undefined) continue;

    const pitchId = lock.tournamentPitchId;
    if (!pitchId && lock.dimension !== "TIME") continue;

    const slot: FeasibilityCandidateSlot =
      pitchId !== undefined
        ? (slotByKey.get(`${pitchId}\0${lock.startUtcMs}`) ?? {
            slotIndex: -1,
            tournamentPitchId: pitchId,
            startUtcMs: lock.startUtcMs,
            resourceEndUtcMs:
              lock.resourceEndUtcMs ?? lock.startUtcMs + matchMs + ms(params.config.transitionMinutes),
            participantEndUtcMs: lock.participantEndUtcMs ?? lock.startUtcMs + matchMs,
          })
        : {
            slotIndex: -1,
            tournamentPitchId: params.candidateSlots[0]?.tournamentPitchId ?? "unknown",
            startUtcMs: lock.startUtcMs,
            resourceEndUtcMs:
              lock.resourceEndUtcMs ?? lock.startUtcMs + matchMs + ms(params.config.transitionMinutes),
            participantEndUtcMs: lock.participantEndUtcMs ?? lock.startUtcMs + matchMs,
          };

    const participantIds = [fixture.sideAParticipantId, fixture.sideBParticipantId];
    const resourceBookings = state.resourceBookings.get(slot.tournamentPitchId) ?? [];
    if (
      !canPlaceFixtureOnSlot({
        fixtureId: fixture.fixtureId,
        participantIds,
        slot,
        config: params.config,
        windowStart: params.tournamentWindow.startUtcMs,
        windowEnd: params.tournamentWindow.endUtcMs,
        resourceBookings,
        participantBookings: state.participantBookings,
        participantLastEnd: state.participantLastEnd,
      })
    ) {
      params.diagnostics.push(
        diag(
          participantOverlapOrRest(resourceBookings, participantIds, state)
            ? "PARTICIPANT_OVERLAP"
            : "MINIMUM_REST",
          [lock.fixtureId],
          "Locked assignment conflicts with participant overlap or minimum rest",
          "H3",
        ),
      );
      return null;
    }
    applyFeasibilitySlot(state, fixture.fixtureId, participantIds, slot);
  }
  return state;
}

function participantOverlapOrRest(
  _resourceBookings: unknown,
  _participantIds: string[],
  _state: FeasibilitySearchState,
): boolean {
  return true;
}
