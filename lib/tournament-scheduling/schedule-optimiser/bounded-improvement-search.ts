import {
  applyFeasibilitySlot,
  type FeasibilitySearchState,
} from "../feasibility/complete-search";
import { canPlaceFixtureOnSlot } from "../feasibility/constraints";
import type {
  FeasibilityCandidateSlot,
  FeasibilityFixtureRef,
  FeasibilitySchedulingConfig,
} from "../feasibility/types";
import {
  BOUNDED_IMPROVEMENT_MAX_CANDIDATE_EVALUATIONS,
  BOUNDED_IMPROVEMENT_MAX_PASSES,
} from "./constants";
import {
  type ResolvedFixtureDependency,
  satisfiesScheduleDependencies,
} from "./dependencies";
import {
  cloneSearchState,
  compareScheduleObjectiveMetrics,
  computeScheduleObjectiveMetrics,
} from "./objective-metrics";
import type { ScheduleObjectiveMetrics } from "./types";

export type BoundedImprovementSearchResult = {
  state: FeasibilitySearchState;
  objectiveMetrics: ScheduleObjectiveMetrics;
  baselineObjectiveMetrics: ScheduleObjectiveMetrics;
  candidateEvaluations: number;
  improvementPasses: number;
  improvementsAccepted: number;
};

function recomputeParticipantLastEnd(state: FeasibilitySearchState): void {
  state.participantLastEnd.clear();
  for (const [participantId, bookings] of state.participantBookings) {
    let maxEnd: number | undefined;
    for (const booking of bookings) {
      if (maxEnd === undefined || booking.participantEndUtcMs > maxEnd) {
        maxEnd = booking.participantEndUtcMs;
      }
    }
    if (maxEnd !== undefined) {
      state.participantLastEnd.set(participantId, maxEnd);
    }
  }
}

function undoFeasibilitySlot(
  state: FeasibilitySearchState,
  fixtureId: string,
  participantIds: string[],
  slot: FeasibilityCandidateSlot,
): void {
  state.assignments.delete(fixtureId);
  const resourceList = state.resourceBookings.get(slot.tournamentPitchId) ?? [];
  state.resourceBookings.set(
    slot.tournamentPitchId,
    resourceList.filter((b) => b.fixtureId !== fixtureId),
  );
  for (const participantId of participantIds) {
    const list = state.participantBookings.get(participantId) ?? [];
    state.participantBookings.set(
      participantId,
      list.filter((b) => b.fixtureId !== fixtureId),
    );
  }
  recomputeParticipantLastEnd(state);
}

function stateSatisfiesAllDependencies(
  state: FeasibilitySearchState,
  dependencies: Map<string, ResolvedFixtureDependency[]>,
): boolean {
  for (const [fixtureId, slot] of state.assignments) {
    if (
      !satisfiesScheduleDependencies({
        fixtureId,
        slot,
        state,
        dependencies,
      })
    ) {
      return false;
    }
  }
  return true;
}

function tryRelocateFixture(params: {
  state: FeasibilitySearchState;
  fixture: FeasibilityFixtureRef;
  slots: readonly FeasibilityCandidateSlot[];
  config: FeasibilitySchedulingConfig;
  windowStart: number;
  windowEnd: number;
  dependencies: Map<string, ResolvedFixtureDependency[]>;
  incumbentMetrics: ScheduleObjectiveMetrics;
  windowStartUtcMs: number;
  pitchIds: readonly string[];
}): { nextState: FeasibilitySearchState | null; candidateEvaluations: number } {
  const currentSlot = params.state.assignments.get(params.fixture.fixtureId);
  if (!currentSlot) return { nextState: null, candidateEvaluations: 0 };

  const participantIds = [params.fixture.sideAParticipantId, params.fixture.sideBParticipantId];
  undoFeasibilitySlot(params.state, params.fixture.fixtureId, participantIds, currentSlot);

  let bestState: FeasibilitySearchState | null = null;
  let bestMetrics: ScheduleObjectiveMetrics | null = null;
  let candidateEvaluations = 0;

  for (const slot of params.slots) {
    if (
      slot.tournamentPitchId === currentSlot.tournamentPitchId &&
      slot.startUtcMs === currentSlot.startUtcMs
    ) {
      continue;
    }

    const resourceBookings = params.state.resourceBookings.get(slot.tournamentPitchId) ?? [];
    if (
      !canPlaceFixtureOnSlot({
        fixtureId: params.fixture.fixtureId,
        participantIds,
        slot,
        config: params.config,
        windowStart: params.windowStart,
        windowEnd: params.windowEnd,
        resourceBookings,
        participantBookings: params.state.participantBookings,
        participantLastEnd: params.state.participantLastEnd,
      })
    ) {
      continue;
    }
    if (
      !satisfiesScheduleDependencies({
        fixtureId: params.fixture.fixtureId,
        slot,
        state: params.state,
        dependencies: params.dependencies,
      })
    ) {
      continue;
    }

    candidateEvaluations += 1;
    applyFeasibilitySlot(params.state, params.fixture.fixtureId, participantIds, slot);
    if (stateSatisfiesAllDependencies(params.state, params.dependencies)) {
      const metrics = computeScheduleObjectiveMetrics({
        state: params.state,
        config: params.config,
        windowStartUtcMs: params.windowStartUtcMs,
        pitchIds: params.pitchIds,
      });
      if (compareScheduleObjectiveMetrics(metrics, params.incumbentMetrics) < 0) {
        if (
          bestMetrics === null ||
          compareScheduleObjectiveMetrics(metrics, bestMetrics) < 0
        ) {
          bestMetrics = metrics;
          bestState = cloneSearchState(params.state);
        }
      }
    }
    undoFeasibilitySlot(params.state, params.fixture.fixtureId, participantIds, slot);
  }

  applyFeasibilitySlot(params.state, params.fixture.fixtureId, participantIds, currentSlot);
  return { nextState: bestState, candidateEvaluations };
}

/**
 * Deterministic single-fixture relocation hill-climb on the 01D candidate-slot grid.
 * Never returns a schedule lexicographically worse than the baseline witness.
 */
export function boundedImprovementSearch(params: {
  fixtures: readonly FeasibilityFixtureRef[];
  slots: readonly FeasibilityCandidateSlot[];
  config: FeasibilitySchedulingConfig;
  windowStart: number;
  windowEnd: number;
  windowStartUtcMs: number;
  pitchIds: readonly string[];
  dependencies: Map<string, ResolvedFixtureDependency[]>;
  baselineState: FeasibilitySearchState;
  maxPasses?: number;
  maxCandidateEvaluations?: number;
}): BoundedImprovementSearchResult {
  let state = cloneSearchState(params.baselineState);
  const baselineObjectiveMetrics = computeScheduleObjectiveMetrics({
    state,
    config: params.config,
    windowStartUtcMs: params.windowStartUtcMs,
    pitchIds: params.pitchIds,
  });

  let incumbentMetrics = baselineObjectiveMetrics;
  const maxPasses = params.maxPasses ?? BOUNDED_IMPROVEMENT_MAX_PASSES;
  const maxEvaluations =
    params.maxCandidateEvaluations ?? BOUNDED_IMPROVEMENT_MAX_CANDIDATE_EVALUATIONS;

  let candidateEvaluations = 0;
  let improvementPasses = 0;
  let improvementsAccepted = 0;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    if (candidateEvaluations >= maxEvaluations) break;
    improvementPasses += 1;
    let passImproved = false;

    for (const fixture of params.fixtures) {
      if (candidateEvaluations >= maxEvaluations) break;
      if (!state.assignments.has(fixture.fixtureId)) continue;

      const { nextState, candidateEvaluations: slotEvaluations } = tryRelocateFixture({
        state,
        fixture,
        slots: params.slots,
        config: params.config,
        windowStart: params.windowStart,
        windowEnd: params.windowEnd,
        dependencies: params.dependencies,
        incumbentMetrics,
        windowStartUtcMs: params.windowStartUtcMs,
        pitchIds: params.pitchIds,
      });
      candidateEvaluations += slotEvaluations;

      if (nextState) {
        state = nextState;
        incumbentMetrics = computeScheduleObjectiveMetrics({
          state,
          config: params.config,
          windowStartUtcMs: params.windowStartUtcMs,
          pitchIds: params.pitchIds,
        });
        passImproved = true;
        improvementsAccepted += 1;
      }
    }

    if (!passImproved) break;
  }

  const objectiveMetrics = computeScheduleObjectiveMetrics({
    state,
    config: params.config,
    windowStartUtcMs: params.windowStartUtcMs,
    pitchIds: params.pitchIds,
  });

  if (compareScheduleObjectiveMetrics(objectiveMetrics, baselineObjectiveMetrics) > 0) {
    return {
      state: cloneSearchState(params.baselineState),
      objectiveMetrics: baselineObjectiveMetrics,
      baselineObjectiveMetrics,
      candidateEvaluations,
      improvementPasses,
      improvementsAccepted: 0,
    };
  }

  return {
    state,
    objectiveMetrics,
    baselineObjectiveMetrics,
    candidateEvaluations,
    improvementPasses,
    improvementsAccepted,
  };
}
