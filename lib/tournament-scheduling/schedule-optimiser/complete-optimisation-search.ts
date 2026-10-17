import {
  applyFeasibilitySlot,
  createFeasibilitySearchState,
  type FeasibilitySearchState,
} from "../feasibility/complete-search";
import { canPlaceFixtureOnSlot } from "../feasibility/constraints";
import type {
  FeasibilityCandidateSlot,
  FeasibilityFixtureRef,
  FeasibilitySchedulingConfig,
} from "../feasibility/types";
import {
  type ResolvedFixtureDependency,
  satisfiesScheduleDependencies,
} from "./dependencies";
import {
  cloneSearchState,
  compareScheduleObjectiveMetrics,
  computeScheduleObjectiveMetrics,
} from "./objective-metrics";
import { OPTIMISER_MAX_SEARCH_NODES } from "./constants";
import type { ScheduleObjectiveMetrics, TournamentFixtureScheduleAssignment } from "./types";
import {
  bundleFromState,
  compareRegenerationObjectiveBundles,
  type RegenerationObjectiveBundle,
} from "../partial-regeneration/disruption-metrics";
import type { ResolvedFixtureScheduleLock } from "../schedule-lock/normalize";
import { isFixtureFullyLockedInState } from "../schedule-lock/normalize";
import { filterSlotsForFixtureLock } from "./regeneration-context";

export type CompleteOptimisationSearchResult = {
  found: boolean;
  bestState: FeasibilitySearchState | null;
  bestObjectiveMetrics: ScheduleObjectiveMetrics | null;
  completeAssignmentsExplored: number;
  nodesVisited: number;
  searchComplete: boolean;
};

export function completeOptimisationSearch(params: {
  fixtures: readonly FeasibilityFixtureRef[];
  slots: readonly FeasibilityCandidateSlot[];
  config: FeasibilitySchedulingConfig;
  windowStart: number;
  windowEnd: number;
  windowStartUtcMs: number;
  pitchIds: readonly string[];
  dependencies: Map<string, ResolvedFixtureDependency[]>;
  initialState?: FeasibilitySearchState;
  maxNodes?: number;
  lockByFixtureId?: Map<string, ResolvedFixtureScheduleLock>;
  baselineAssignments?: readonly TournamentFixtureScheduleAssignment[];
  resolvedLocks?: readonly ResolvedFixtureScheduleLock[];
}): CompleteOptimisationSearchResult {
  let bestState: FeasibilitySearchState | null = null;
  let bestObjectiveMetrics: ScheduleObjectiveMetrics | null = null;
  let bestRegenerationBundle: RegenerationObjectiveBundle | null = null;
  const useRegenerationCompare =
    (params.baselineAssignments?.length ?? 0) > 0 && (params.resolvedLocks?.length ?? 0) >= 0;
  let completeAssignmentsExplored = 0;
  let nodesVisited = 0;
  let searchComplete = true;
  const maxNodes = params.maxNodes ?? OPTIMISER_MAX_SEARCH_NODES;

  const state = params.initialState
    ? cloneSearchState(params.initialState)
    : createFeasibilitySearchState();

  function dfs(fixtureIndex: number): void {
    if (nodesVisited >= maxNodes) {
      searchComplete = false;
      return;
    }
    if (fixtureIndex >= params.fixtures.length) {
      completeAssignmentsExplored += 1;
      const metrics = computeScheduleObjectiveMetrics({
        state,
        config: params.config,
        windowStartUtcMs: params.windowStartUtcMs,
        pitchIds: params.pitchIds,
      });
      if (useRegenerationCompare && params.baselineAssignments && params.resolvedLocks) {
        const bundle = bundleFromState({
          state,
          baselineAssignments: params.baselineAssignments,
          resolvedLocks: params.resolvedLocks,
          scheduleObjectiveMetrics: metrics,
        });
        if (
          bestRegenerationBundle === null ||
          compareRegenerationObjectiveBundles(bundle, bestRegenerationBundle) < 0
        ) {
          bestRegenerationBundle = bundle;
          bestObjectiveMetrics = metrics;
          bestState = cloneSearchState(state);
        }
      } else if (
        bestObjectiveMetrics === null ||
        compareScheduleObjectiveMetrics(metrics, bestObjectiveMetrics) < 0
      ) {
        bestObjectiveMetrics = metrics;
        bestState = cloneSearchState(state);
      }
      return;
    }

    nodesVisited += 1;
    const fixture = params.fixtures[fixtureIndex]!;
    if (state.assignments.has(fixture.fixtureId)) {
      dfs(fixtureIndex + 1);
      return;
    }

    const participantIds = [fixture.sideAParticipantId, fixture.sideBParticipantId];
    const lock = params.lockByFixtureId?.get(fixture.fixtureId);
    if (lock && isFixtureFullyLockedInState(lock)) {
      dfs(fixtureIndex + 1);
      return;
    }
    const slotCandidates = filterSlotsForFixtureLock({ slots: params.slots, lock });
    for (const slot of slotCandidates) {
      const resourceBookings = state.resourceBookings.get(slot.tournamentPitchId) ?? [];
      if (
        !canPlaceFixtureOnSlot({
          fixtureId: fixture.fixtureId,
          participantIds,
          slot,
          config: params.config,
          windowStart: params.windowStart,
          windowEnd: params.windowEnd,
          resourceBookings,
          participantBookings: state.participantBookings,
          participantLastEnd: state.participantLastEnd,
        })
      ) {
        continue;
      }
      if (
        !satisfiesScheduleDependencies({
          fixtureId: fixture.fixtureId,
          slot,
          state,
          dependencies: params.dependencies,
        })
      ) {
        continue;
      }

      applyFeasibilitySlot(state, fixture.fixtureId, participantIds, slot);
      dfs(fixtureIndex + 1);
      undoFeasibilitySlot(state, fixture.fixtureId, participantIds, slot);
    }
  }

  dfs(0);

  return {
    found: bestState !== null,
    bestState,
    bestObjectiveMetrics,
    completeAssignmentsExplored,
    nodesVisited,
    searchComplete,
  };
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
