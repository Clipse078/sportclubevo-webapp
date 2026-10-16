import { canPlaceFixtureOnSlot } from "./constraints";
import type {
  FeasibilityCandidateSlot,
  FeasibilitySchedulingConfig,
  TournamentFeasibilityInput,
} from "./types";

export type FeasibilitySearchState = {
  assignments: Map<string, FeasibilityCandidateSlot>;
  resourceBookings: Map<
    string,
    Array<{ fixtureId: string; startUtcMs: number; resourceEndUtcMs: number }>
  >;
  participantBookings: Map<
    string,
    Array<{ fixtureId: string; startUtcMs: number; participantEndUtcMs: number }>
  >;
  participantLastEnd: Map<string, number>;
};

export function createFeasibilitySearchState(): FeasibilitySearchState {
  return {
    assignments: new Map(),
    resourceBookings: new Map(),
    participantBookings: new Map(),
    participantLastEnd: new Map(),
  };
}

export function applyFeasibilitySlot(
  state: FeasibilitySearchState,
  fixtureId: string,
  participantIds: string[],
  slot: FeasibilityCandidateSlot,
): void {
  state.assignments.set(fixtureId, slot);
  const resourceList = state.resourceBookings.get(slot.tournamentPitchId) ?? [];
  resourceList.push({
    fixtureId,
    startUtcMs: slot.startUtcMs,
    resourceEndUtcMs: slot.resourceEndUtcMs,
  });
  state.resourceBookings.set(slot.tournamentPitchId, resourceList);

  for (const participantId of participantIds) {
    const list = state.participantBookings.get(participantId) ?? [];
    list.push({
      fixtureId,
      startUtcMs: slot.startUtcMs,
      participantEndUtcMs: slot.participantEndUtcMs,
    });
    state.participantBookings.set(participantId, list);
    const prev = state.participantLastEnd.get(participantId);
    if (prev === undefined || slot.participantEndUtcMs > prev) {
      state.participantLastEnd.set(participantId, slot.participantEndUtcMs);
    }
  }
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

/**
 * Deterministic complete backtracking search within MVP candidate-slot bounds.
 */
export function completeFeasibilitySearch(params: {
  fixtures: readonly TournamentFeasibilityInput["fixtures"][number][];
  slots: readonly FeasibilityCandidateSlot[];
  config: FeasibilitySchedulingConfig;
  windowStart: number;
  windowEnd: number;
  state: FeasibilitySearchState;
}): boolean {
  function dfs(fixtureIndex: number): boolean {
    if (fixtureIndex >= params.fixtures.length) {
      return true;
    }

    const fixture = params.fixtures[fixtureIndex]!;
    if (params.state.assignments.has(fixture.fixtureId)) {
      return dfs(fixtureIndex + 1);
    }

    const participantIds = [fixture.sideAParticipantId, fixture.sideBParticipantId];
    for (const slot of params.slots) {
      const resourceBookings = params.state.resourceBookings.get(slot.tournamentPitchId) ?? [];
      if (
        !canPlaceFixtureOnSlot({
          fixtureId: fixture.fixtureId,
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
      applyFeasibilitySlot(params.state, fixture.fixtureId, participantIds, slot);
      if (dfs(fixtureIndex + 1)) {
        return true;
      }
      undoFeasibilitySlot(params.state, fixture.fixtureId, participantIds, slot);
    }
    return false;
  }

  return dfs(0);
}
