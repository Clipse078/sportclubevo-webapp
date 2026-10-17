import { analyseTournamentFeasibility } from "../feasibility/analyse";
import {
  FEASIBILITY_MAX_CANDIDATE_SLOTS,
  FEASIBILITY_MAX_FIXTURES,
  FEASIBILITY_MAX_PARTICIPANTS,
  FEASIBILITY_MAX_PITCHES,
} from "../feasibility/constants";
import {
  computeTheoreticalSlotCapacity,
  generateFeasibilityCandidateSlots,
} from "../feasibility/candidate-slots";
import {
  applyFeasibilitySlot,
  createFeasibilitySearchState,
} from "../feasibility/complete-search";
import { canPlaceFixtureOnSlot } from "../feasibility/constraints";
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

function buildInitialStateFromLocks(
  input: TournamentFeasibilityInput,
  sortedFixtures: TournamentFeasibilityInput["fixtures"],
  candidateSlots: readonly FeasibilityCandidateSlot[],
  config: ReturnType<typeof normalizeTimingConfig>,
): { ok: true; state: ReturnType<typeof createFeasibilitySearchState> } | { ok: false } {
  const slotByKey = new Map<string, FeasibilityCandidateSlot>();
  for (const slot of candidateSlots) {
    slotByKey.set(`${slot.tournamentPitchId}\0${slot.startUtcMs}`, slot);
  }
  const fixtureById = new Map(sortedFixtures.map((f) => [f.fixtureId, f]));
  const state = createFeasibilitySearchState();

  for (const locked of input.lockedAssignments ?? []) {
    const fixture = fixtureById.get(locked.fixtureId);
    if (!fixture) return { ok: false };
    const matchMs = config.matchDurationMinutes * 60_000;
    const slot: FeasibilityCandidateSlot =
      slotByKey.get(`${locked.tournamentPitchId}\0${locked.startUtcMs}`) ?? {
        slotIndex: -1,
        tournamentPitchId: locked.tournamentPitchId,
        startUtcMs: locked.startUtcMs,
        resourceEndUtcMs: locked.startUtcMs + matchMs + ms(config.transitionMinutes),
        participantEndUtcMs: locked.startUtcMs + matchMs,
      };
    const participantIds = [fixture.sideAParticipantId, fixture.sideBParticipantId];
    const resourceBookings = state.resourceBookings.get(slot.tournamentPitchId) ?? [];
    if (
      !canPlaceFixtureOnSlot({
        fixtureId: fixture.fixtureId,
        participantIds,
        slot,
        config,
        windowStart: input.tournamentWindow.startUtcMs,
        windowEnd: input.tournamentWindow.endUtcMs,
        resourceBookings,
        participantBookings: state.participantBookings,
        participantLastEnd: state.participantLastEnd,
      })
    ) {
      return { ok: false };
    }
    applyFeasibilitySlot(state, fixture.fixtureId, participantIds, slot);
  }
  return { ok: true, state };
}

/**
 * Pure deterministic schedule optimiser (01F2) — WHEN + WHICH TournamentPitch.
 * Reuses 01D candidate slots, hard constraints, and complete search bounds.
 */
export function optimiseTournamentSchedule(
  input: TournamentScheduleOptimisationInput,
): TournamentScheduleOptimisationResult {
  const config = normalizeTimingConfig(input.config);
  const participantRestProofStatus = resolveParticipantRestProofStatus(input.fixtures);
  const feasibilityInput = buildTournamentFeasibilityInput(
    { ...input, mode: "FIXED_ASSESSMENT", fixtures: input.fixtures },
    config,
    input.tournamentWindow,
  );

  const feasibility = analyseTournamentFeasibility(feasibilityInput);
  const emptyStats = {
    candidateSlotCount: 0,
    completeAssignmentsExplored: 0,
    nodesVisited: 0,
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
      optimalityNote:
        "INFEASIBLE established by 01D proof or complete bounded search — not heuristic-only.",
    };
  }

  if (
    input.participants.length > FEASIBILITY_MAX_PARTICIPANTS ||
    input.fixtures.length > FEASIBILITY_MAX_FIXTURES ||
    input.tournamentPitches.length > FEASIBILITY_MAX_PITCHES
  ) {
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
          code: "LIMIT.FIXTURES_EXCEEDED",
          context: { reason: "OPTIMISER_BOUNDS" },
        },
      ],
      searchStats: emptyStats,
      optimalityNote: "Input exceeds MVP optimiser safety bounds.",
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
      optimalityNote: "Fixture set structurally invalid.",
    };
  }

  const candidateSlots = generateFeasibilityCandidateSlots(
    tournamentPitches,
    config,
    blockedIntervalsByPitchId,
  );

  if (candidateSlots.length > FEASIBILITY_MAX_CANDIDATE_SLOTS) {
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
            max: FEASIBILITY_MAX_CANDIDATE_SLOTS,
          },
        },
      ],
      searchStats: { ...emptyStats, candidateSlotCount: candidateSlots.length },
      optimalityNote: "Candidate slot grid exceeds complete-search MVP cap.",
    };
  }

  const dependencies = resolveFixtureDependencies(input.fixtures);
  const sortedFixtures = sortFixturesForOptimisation(feasibilityFixtures, dependencies);
  const pitchIds = tournamentPitches.map((p) => p.tournamentPitchId);

  const lockState = buildInitialStateFromLocks(
    feasibilityInput,
    sortedFixtures,
    candidateSlots,
    config,
  );
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
      optimalityNote: "Locked assignments conflict with hard constraints.",
    };
  }

  const useExhaustiveLex = sortedFixtures.length <= EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES;

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
        candidateSlotCount: candidateSlots.length,
        completeAssignmentsExplored: search.completeAssignmentsExplored,
        nodesVisited: search.nodesVisited,
      },
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

  return {
    status,
    participantRestProofStatus,
    assignments,
    hardConstraintValidationOk: hardOk,
    objectiveMetrics: finalMetrics,
    objectiveScore: finalMetrics,
    feasibilityMetrics: metrics,
    diagnostics: [],
    searchStats: {
      candidateSlotCount: candidateSlots.length,
      completeAssignmentsExplored: search.completeAssignmentsExplored,
      nodesVisited: search.nodesVisited,
    },
    optimalityNote:
      status === "OPTIMAL"
        ? "OPTIMAL within 01D discrete candidate-slot grid — complete enumeration of feasible assignments."
        : "Feasible schedule with lex-best objective among search budget; optimality not proven (node budget or partial enumeration).",
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
