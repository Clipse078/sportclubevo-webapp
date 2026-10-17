import { canPlaceFixtureOnSlot, slotWithinTournamentWindow } from "../feasibility/constraints";
import type { FeasibilitySchedulingConfig, TournamentFeasibilityInput } from "../feasibility/types";
import {
  createFeasibilitySearchState,
  applyFeasibilitySlot,
} from "../feasibility/complete-search";
import type { FeasibilityCandidateSlot } from "../feasibility/types";
import type { ResolvedFixtureDependency } from "./dependencies";
import { satisfiesScheduleDependencies } from "./dependencies";
import type { TournamentFixtureScheduleAssignment } from "./types";

export function validateOptimisedScheduleHardConstraints(params: {
  input: TournamentFeasibilityInput;
  assignments: readonly TournamentFixtureScheduleAssignment[];
  config: FeasibilitySchedulingConfig;
  dependencies: Map<string, ResolvedFixtureDependency[]>;
}): boolean {
  const fixtureById = new Map(params.input.fixtures.map((f) => [f.fixtureId, f]));
  const pitchIds = new Set(params.input.tournamentPitches.map((p) => p.tournamentPitchId));

  if (params.assignments.length !== params.input.fixtures.length) return false;

  const assignedFixtures = new Set<string>();
  for (const assignment of params.assignments) {
    if (assignedFixtures.has(assignment.fixtureId)) return false;
    assignedFixtures.add(assignment.fixtureId);
    if (!fixtureById.has(assignment.fixtureId)) return false;
    if (!pitchIds.has(assignment.tournamentPitchId)) return false;
  }

  for (const fixture of params.input.fixtures) {
    if (!assignedFixtures.has(fixture.fixtureId)) return false;
  }

  const ordered = [...params.assignments].sort(
    (a, b) => a.startUtcMs - b.startUtcMs || a.fixtureId.localeCompare(b.fixtureId),
  );

  const state = createFeasibilitySearchState();

  for (const assignment of ordered) {
    const fixture = fixtureById.get(assignment.fixtureId)!;
    const slot: FeasibilityCandidateSlot = {
      slotIndex: -1,
      tournamentPitchId: assignment.tournamentPitchId,
      startUtcMs: assignment.startUtcMs,
      resourceEndUtcMs: assignment.resourceEndUtcMs,
      participantEndUtcMs: assignment.endUtcMs,
    };

    if (
      !slotWithinTournamentWindow(
        params.input.tournamentWindow.startUtcMs,
        params.input.tournamentWindow.endUtcMs,
        slot,
      )
    ) {
      return false;
    }

    const participantIds = [fixture.sideAParticipantId, fixture.sideBParticipantId];
    const resourceBookings = state.resourceBookings.get(slot.tournamentPitchId) ?? [];

    if (
      !canPlaceFixtureOnSlot({
        fixtureId: fixture.fixtureId,
        participantIds,
        slot,
        config: params.config,
        windowStart: params.input.tournamentWindow.startUtcMs,
        windowEnd: params.input.tournamentWindow.endUtcMs,
        resourceBookings,
        participantBookings: state.participantBookings,
        participantLastEnd: state.participantLastEnd,
      })
    ) {
      return false;
    }

    if (
      !satisfiesScheduleDependencies({
        fixtureId: fixture.fixtureId,
        slot,
        state,
        dependencies: params.dependencies,
      })
    ) {
      return false;
    }

    applyFeasibilitySlot(state, fixture.fixtureId, participantIds, slot);
  }

  return true;
}
