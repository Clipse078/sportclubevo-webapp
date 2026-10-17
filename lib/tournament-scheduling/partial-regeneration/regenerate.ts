import { buildBlockedIntervalsByPitchId } from "../feasibility/break-intervals";
import { generateFeasibilityCandidateSlots } from "../feasibility/candidate-slots";
import { buildTournamentPitchAvailability } from "../feasibility/pitch-availability";
import { toFeasibilityFixtures } from "../smart-timing/prepare-context";
import { resolveFixtureDependencies } from "../schedule-optimiser/dependencies";
import { optimiseTournamentSchedule } from "../schedule-optimiser/optimise";
import type {
  TournamentPartialRegenerationInput,
  TournamentPartialRegenerationResult,
} from "../schedule-optimiser/types";
import { buildRegenerationSearchContext } from "../schedule-optimiser/regeneration-context";
import { validateResolvedScheduleLocks } from "../schedule-lock/validate-locks";
import { computeRegenerationChangeMetrics } from "./disruption-metrics";
import {
  buildTournamentFeasibilityInput,
  normalizeTimingConfig,
} from "../smart-timing/prepare-context";

/**
 * Pure deterministic partial schedule regeneration (01G).
 * Reuses 01F2 optimiser — no parallel engine, no persistence.
 */
export function regenerateTournamentSchedule(
  input: TournamentPartialRegenerationInput,
): TournamentPartialRegenerationResult {
  const config = normalizeTimingConfig(input.config);
  const regeneration = buildRegenerationSearchContext(input);
  const feasibilityInput = buildTournamentFeasibilityInput(
    {
      ...input,
      mode: "FIXED_ASSESSMENT",
      fixtures: input.fixtures,
      lockedAssignments: regeneration.feasibilityLockedAssignments,
    },
    config,
    input.tournamentWindow,
  );

  const blockedIntervalsByPitchId = buildBlockedIntervalsByPitchId({
    breaks: feasibilityInput.breaks,
    pitches: feasibilityInput.tournamentPitches,
    tournamentWindow: feasibilityInput.tournamentWindow,
  });
  const tournamentPitches = buildTournamentPitchAvailability({
    tournamentWindow: feasibilityInput.tournamentWindow,
    pitches: feasibilityInput.tournamentPitches,
    blockedIntervalsByPitchId,
  });
  const candidateSlots = generateFeasibilityCandidateSlots(
    tournamentPitches,
    config,
    blockedIntervalsByPitchId,
  );
  const dependencies = resolveFixtureDependencies(input.fixtures);
  const pitchIds = new Set(tournamentPitches.map((p) => p.tournamentPitchId));

  const lockValidation = validateResolvedScheduleLocks({
    resolvedLocks: regeneration.resolvedLocks,
    fixtures: toFeasibilityFixtures(input.fixtures),
    pitchIds,
    tournamentWindow: feasibilityInput.tournamentWindow,
    config,
    candidateSlots,
    dependencies,
    blockedIntervalsByPitchId,
  });

  if (!lockValidation.ok) {
    return {
      status: "INFEASIBLE_PROVEN",
      participantRestProofStatus: "UNRESOLVED",
      assignments: [],
      hardConstraintValidationOk: false,
      objectiveMetrics: null,
      objectiveScore: null,
      feasibilityMetrics: null,
      diagnostics: lockValidation.diagnostics.map((d) => ({
        code: "LOCKS.CONFLICTING" as const,
        constraintId: d.constraintId,
        context: {
          category: d.category,
          fixtureIds: d.fixtureIds.join(","),
          message: d.message,
          ...(d.context
            ? Object.fromEntries(
                Object.entries(d.context).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : v]),
              )
            : {}),
        },
      })),
      baselineObjectiveMetrics: null,
      changeMetrics: null,
      lockConflictDiagnostics: lockValidation.diagnostics,
      preservedLockCount: regeneration.resolvedLocks.length,
      searchStats: {
        candidateSlotCount: candidateSlots.length,
        completeAssignmentsExplored: 0,
        nodesVisited: 0,
      },
      optimalityNote: "Lock set invalid — regeneration not attempted.",
    };
  }

  const optimisation = optimiseTournamentSchedule({
    ...input,
    config,
    lockedAssignments: regeneration.feasibilityLockedAssignments,
    scheduleLocks: input.scheduleLocks,
    baselineAssignments: input.baselineAssignments,
  });

  const changeMetrics =
    optimisation.assignments.length > 0
      ? computeRegenerationChangeMetrics({
          baselineAssignments: input.baselineAssignments,
          resultAssignments: optimisation.assignments,
          resolvedLocks: regeneration.resolvedLocks,
        })
      : null;

  return {
    ...optimisation,
    changeMetrics,
    lockConflictDiagnostics: [],
    preservedLockCount: regeneration.resolvedLocks.length,
  };
}
