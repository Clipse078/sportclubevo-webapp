import { analyseTournamentFeasibility } from "../feasibility/analyse";
import { FEASIBILITY_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS } from "../feasibility/constants";
import {
  computeTheoreticalSlotCapacity,
  generateFeasibilityCandidateSlots,
} from "../feasibility/candidate-slots";
import { createFeasibilitySearchState } from "../feasibility/complete-search";
import {
  buildBlockedIntervalsByPitchId,
  validateTournamentBreaksInput,
} from "../feasibility/break-intervals";
import { validateFeasibilityFixtureSet } from "../feasibility/fixture-validation";
import { buildFeasibilityMetrics } from "../feasibility/metrics";
import { buildTournamentPitchAvailability } from "../feasibility/pitch-availability";
import type { FeasibilityCandidateSlot, TournamentFeasibilityInput } from "../feasibility/types";
import {
  buildFeasibilityParticipants,
  buildTournamentFeasibilityInput,
  normalizeTimingConfig,
  resolveParticipantRestProofStatus,
  toFeasibilityFixtures,
} from "../smart-timing/prepare-context";
import { completeFeasibilitySearch } from "../feasibility/complete-search";
import { EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES } from "./constants";
import { boundedImprovementSearch } from "./bounded-improvement-search";
import { completeOptimisationSearch } from "./complete-optimisation-search";
import { computeScheduleObjectiveMetrics } from "./objective-metrics";
import {
  resolveFixtureDependencies,
  sortFixturesForOptimisation,
} from "./dependencies";
import type {
  TournamentFixtureScheduleAssignment,
  TournamentScheduleOptimisationInput,
  TournamentScheduleOptimisationResult,
} from "./types";
import { validateOptimisedScheduleHardConstraints } from "./validate-schedule";
import {
  buildInitialSearchStateFromRegeneration,
  buildRegenerationSearchContext,
  seedUnlockedBaselineIntoState,
} from "./regeneration-context";
import { computeRegenerationChangeMetrics } from "../partial-regeneration/disruption-metrics";

function ms(minutes: number): number {
  return minutes * 60_000;
}

function mapAssignmentsFromState(
  state: ReturnType<typeof createFeasibilitySearchState>,
): TournamentFixtureScheduleAssignment[] {
  return [...state.assignments.entries()]
    .sort((a, b) => a[1].startUtcMs - b[1].startUtcMs || a[0].localeCompare(b[0]))
    .map(([fixtureId, slot]) => ({
      fixtureId,
      tournamentPitchId: slot.tournamentPitchId,
      startUtcMs: slot.startUtcMs,
      endUtcMs: slot.participantEndUtcMs,
      resourceEndUtcMs: slot.resourceEndUtcMs,
    }));
}

/**
 * Pure deterministic schedule optimiser (01F2) — WHEN + WHICH TournamentPitch.
 * Reuses 01D candidate slots, hard constraints, and complete search bounds.
 */
export function optimiseTournamentSchedule(
  input: TournamentScheduleOptimisationInput,
): TournamentScheduleOptimisationResult {
  const config = normalizeTimingConfig(input.config);
  const regeneration = buildRegenerationSearchContext(input);
  const participantRestProofStatus = resolveParticipantRestProofStatus(input.fixtures);
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

  const feasibility = analyseTournamentFeasibility(feasibilityInput);
  const emptyStats = {
    candidateSlotCount: 0,
    completeAssignmentsExplored: 0,
    nodesVisited: 0,
    boundedImprovementPasses: 0,
    boundedImprovementEvaluations: 0,
    boundedImprovementAccepted: 0,
  };

  if (feasibility.status === "INFEASIBLE") {
    return {
      status: "INFEASIBLE_PROVEN",
      participantRestProofStatus,
      assignments: [],
      hardConstraintValidationOk: false,
      objectiveMetrics: null,
      objectiveScore: null,
      feasibilityMetrics: feasibility.metrics,
      diagnostics: feasibility.diagnostics,
      searchStats: emptyStats,
      baselineObjectiveMetrics: null,
      optimalityNote:
        "INFEASIBLE established by 01D proof or complete bounded search — not heuristic-only.",
    };
  }

  const breakDiagnostics = validateTournamentBreaksInput({
    breaks: feasibilityInput.breaks,
    pitches: feasibilityInput.tournamentPitches,
    tournamentWindow: feasibilityInput.tournamentWindow,
  });
  if (breakDiagnostics.some((d) => d.code === "BREAK.INVALID" || d.code === "BREAK.UNKNOWN_PITCH")) {
    return {
      status: "INFEASIBLE_PROVEN",
      participantRestProofStatus,
      assignments: [],
      hardConstraintValidationOk: false,
      objectiveMetrics: null,
      objectiveScore: null,
      feasibilityMetrics: feasibility.metrics,
      diagnostics: breakDiagnostics,
      searchStats: emptyStats,
      baselineObjectiveMetrics: null,
      optimalityNote: "Break topology invalid.",
    };
  }

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

  const feasibilityFixtures = toFeasibilityFixtures(input.fixtures);
  const fixtureValidation = validateFeasibilityFixtureSet(
    feasibilityFixtures,
    buildFeasibilityParticipants(input.participants, feasibilityFixtures),
  );
  if (!fixtureValidation.ok) {
    return {
      status: "INFEASIBLE_PROVEN",
      participantRestProofStatus,
      assignments: [],
      hardConstraintValidationOk: false,
      objectiveMetrics: null,
      objectiveScore: null,
      feasibilityMetrics: feasibility.metrics,
      diagnostics: fixtureValidation.diagnostics,
      searchStats: emptyStats,
      baselineObjectiveMetrics: null,
      optimalityNote: "Fixture set structurally invalid.",
    };
  }

  const candidateSlots = generateFeasibilityCandidateSlots(
    tournamentPitches,
    config,
    blockedIntervalsByPitchId,
  );

  if (candidateSlots.length > FEASIBILITY_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS) {
    return {
      status: "UNRESOLVED",
      participantRestProofStatus,
      assignments: [],
      hardConstraintValidationOk: false,
      objectiveMetrics: null,
      objectiveScore: null,
      feasibilityMetrics: feasibility.metrics,
      diagnostics: [
        {
          code: "SLOTS.TOO_MANY_CANDIDATES",
          constraintId: "H9",
          context: {
            candidateSlotCount: candidateSlots.length,
            max: FEASIBILITY_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS,
          },
        },
      ],
      searchStats: { ...emptyStats, candidateSlotCount: candidateSlots.length },
      baselineObjectiveMetrics: null,
      optimalityNote: "Candidate slot grid exceeds complete-search MVP cap.",
    };
  }

  const dependencies = resolveFixtureDependencies(input.fixtures);
  const sortedFixtures = sortFixturesForOptimisation(feasibilityFixtures, dependencies);
  const pitchIds = tournamentPitches.map((p) => p.tournamentPitchId);

  const baselineAssignments = input.baselineAssignments ?? [];
  const lockState = buildInitialSearchStateFromRegeneration({
    sortedFixtures,
    candidateSlots,
    config,
    windowStart: feasibilityInput.tournamentWindow.startUtcMs,
    windowEnd: feasibilityInput.tournamentWindow.endUtcMs,
    regeneration,
    baselineAssignments,
  });
  if (!lockState.ok) {
    return {
      status: "INFEASIBLE_PROVEN",
      participantRestProofStatus,
      assignments: [],
      hardConstraintValidationOk: false,
      objectiveMetrics: null,
      objectiveScore: null,
      feasibilityMetrics: feasibility.metrics,
      diagnostics: [{ code: "LOCKS.CONFLICTING", constraintId: "H7" }],
      searchStats: { ...emptyStats, candidateSlotCount: candidateSlots.length },
      baselineObjectiveMetrics: null,
      optimalityNote: "Locked assignments conflict with hard constraints.",
    };
  }

  const useExhaustiveLex = sortedFixtures.length <= EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES;
  let baselineObjectiveMetrics: TournamentScheduleOptimisationResult["baselineObjectiveMetrics"] =
    null;
  let boundedImprovementPasses = 0;
  let boundedImprovementEvaluations = 0;
  let boundedImprovementAccepted = 0;

  const search = useExhaustiveLex
    ? completeOptimisationSearch({
        fixtures: sortedFixtures,
        slots: candidateSlots,
        config,
        windowStart: feasibilityInput.tournamentWindow.startUtcMs,
        windowEnd: feasibilityInput.tournamentWindow.endUtcMs,
        windowStartUtcMs: feasibilityInput.tournamentWindow.startUtcMs,
        pitchIds,
        dependencies,
        initialState: lockState.state,
        lockByFixtureId: regeneration.lockByFixtureId,
        baselineAssignments,
        resolvedLocks: regeneration.resolvedLocks,
      })
    : {
        found: false,
        bestState: null,
        bestObjectiveMetrics: null,
        completeAssignmentsExplored: 0,
        nodesVisited: 0,
        searchComplete: false,
      };

  let finalState = search.bestState;
  let finalMetrics = search.bestObjectiveMetrics;
  let status: TournamentScheduleOptimisationResult["status"] = useExhaustiveLex
    ? search.searchComplete
      ? "OPTIMAL"
      : "FEASIBLE_NOT_PROVEN_OPTIMAL"
    : "FEASIBLE_NOT_PROVEN_OPTIMAL";

  if (search.found && search.bestState) {
    finalState = search.bestState;
    finalMetrics = search.bestObjectiveMetrics;
  }

  if (!useExhaustiveLex && baselineAssignments.length > 0) {
    const witnessState = cloneSearchStateFromLocks(lockState.state);
    const seeded = seedUnlockedBaselineIntoState({
      state: witnessState,
      sortedFixtures,
      candidateSlots,
      config,
      windowStart: feasibilityInput.tournamentWindow.startUtcMs,
      windowEnd: feasibilityInput.tournamentWindow.endUtcMs,
      regeneration,
      baselineAssignments,
    });
    if (!seeded.ok) {
      return {
        status: "INFEASIBLE_PROVEN",
        participantRestProofStatus,
        assignments: [],
        hardConstraintValidationOk: false,
        objectiveMetrics: null,
        objectiveScore: null,
        feasibilityMetrics: feasibility.metrics,
        diagnostics: [{ code: "LOCKS.CONFLICTING", constraintId: "H7" }],
        searchStats: { ...emptyStats, candidateSlotCount: candidateSlots.length },
        baselineObjectiveMetrics: null,
        optimalityNote: "Baseline schedule conflicts with locks or hard constraints.",
      };
    }
    finalState = witnessState;
    finalMetrics = computeScheduleObjectiveMetrics({
      state: witnessState,
      config,
      windowStartUtcMs: feasibilityInput.tournamentWindow.startUtcMs,
      pitchIds,
    });
    status = "FEASIBLE_NOT_PROVEN_OPTIMAL";
  }

  if (!finalState) {
    const witnessState = cloneSearchStateFromLocks(lockState.state);
    const witnessOk = completeFeasibilitySearch({
      fixtures: sortedFixtures,
      slots: candidateSlots,
      config,
      windowStart: feasibilityInput.tournamentWindow.startUtcMs,
      windowEnd: feasibilityInput.tournamentWindow.endUtcMs,
      state: witnessState,
    });
    if (witnessOk) {
      finalState = witnessState;
      finalMetrics = computeScheduleObjectiveMetrics({
        state: witnessState,
        config,
        windowStartUtcMs: feasibilityInput.tournamentWindow.startUtcMs,
        pitchIds,
      });
      status = "FEASIBLE_NOT_PROVEN_OPTIMAL";
    }
  }

  if (finalState && !useExhaustiveLex) {
    const improved = boundedImprovementSearch({
      fixtures: sortedFixtures,
      slots: candidateSlots,
      config,
      windowStart: feasibilityInput.tournamentWindow.startUtcMs,
      windowEnd: feasibilityInput.tournamentWindow.endUtcMs,
      windowStartUtcMs: feasibilityInput.tournamentWindow.startUtcMs,
      pitchIds,
      dependencies,
      baselineState: finalState,
      lockByFixtureId: regeneration.lockByFixtureId,
      baselineAssignments,
      resolvedLocks: regeneration.resolvedLocks,
    });
    baselineObjectiveMetrics = improved.baselineObjectiveMetrics;
    finalState = improved.state;
    finalMetrics = improved.objectiveMetrics;
    boundedImprovementPasses = improved.improvementPasses;
    boundedImprovementEvaluations = improved.candidateEvaluations;
    boundedImprovementAccepted = improved.improvementsAccepted;
    status = "FEASIBLE_NOT_PROVEN_OPTIMAL";
  }

  if (!finalState) {
    return {
      status: "INFEASIBLE_PROVEN",
      participantRestProofStatus,
      assignments: [],
      hardConstraintValidationOk: false,
      objectiveMetrics: null,
      objectiveScore: null,
      feasibilityMetrics: feasibility.metrics,
      diagnostics: [
        {
          code: "ASSIGNMENT.SEARCH_EXHAUSTED",
          constraintId: "H12",
          context: { search: "COMPLETE_OPTIMISATION" },
        },
      ],
      searchStats: {
        ...emptyStats,
        candidateSlotCount: candidateSlots.length,
        completeAssignmentsExplored: search.completeAssignmentsExplored,
        nodesVisited: search.nodesVisited,
      },
      baselineObjectiveMetrics: null,
      optimalityNote: "No feasible assignment found.",
    };
  }

  const assignments = mapAssignmentsFromState(finalState);
  const hardOk = validateOptimisedScheduleHardConstraints({
    input: feasibilityInput,
    assignments,
    config,
    dependencies,
  });

  const metrics = buildFeasibilityMetrics({
    fixtures: feasibilityFixtures,
    tournamentPitches,
    tournamentWindow: feasibilityInput.tournamentWindow,
    config,
    candidateSlotCount: candidateSlots.length,
    theoreticalSlotCapacity: computeTheoreticalSlotCapacity(tournamentPitches, config),
    participantMinRestSlackMinutes: null,
  });

  const changeMetrics =
    baselineAssignments.length > 0 && assignments.length > 0
      ? computeRegenerationChangeMetrics({
          baselineAssignments,
          resultAssignments: assignments,
          resolvedLocks: regeneration.resolvedLocks,
        })
      : null;

  return {
    status,
    participantRestProofStatus,
    assignments,
    hardConstraintValidationOk: hardOk,
    objectiveMetrics: finalMetrics,
    objectiveScore: finalMetrics,
    feasibilityMetrics: metrics,
    diagnostics: [],
    baselineObjectiveMetrics,
    changeMetrics,
    searchStats: {
      candidateSlotCount: candidateSlots.length,
      completeAssignmentsExplored: search.completeAssignmentsExplored,
      nodesVisited: search.nodesVisited,
      boundedImprovementPasses,
      boundedImprovementEvaluations,
      boundedImprovementAccepted,
    },
    optimalityNote:
      status === "OPTIMAL"
        ? "OPTIMAL within 01D discrete candidate-slot grid — complete enumeration of feasible assignments."
        : useExhaustiveLex
          ? "Feasible schedule with lex-best objective among complete-search node budget; optimality not proven."
          : "Feasible schedule after 01D witness plus deterministic bounded relocation improvement; optimality not proven.",
  };
}

function cloneSearchStateFromLocks(
  state: ReturnType<typeof createFeasibilitySearchState>,
): ReturnType<typeof createFeasibilitySearchState> {
  return {
    assignments: new Map(state.assignments),
    resourceBookings: new Map(
      [...state.resourceBookings.entries()].map(([k, v]) => [k, [...v]] as const),
    ),
    participantBookings: new Map(
      [...state.participantBookings.entries()].map(([k, v]) => [k, [...v]] as const),
    ),
    participantLastEnd: new Map(state.participantLastEnd),
  };
}
