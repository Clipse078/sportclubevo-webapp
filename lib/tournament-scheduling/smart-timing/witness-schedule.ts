import {
  FEASIBILITY_MAX_CANDIDATE_SLOTS,
  FEASIBILITY_MAX_FIXTURES,
  FEASIBILITY_MAX_PARTICIPANTS,
  FEASIBILITY_MAX_PITCHES,
} from "../feasibility/constants";
import {
  buildBlockedIntervalsByPitchId,
  validateTournamentBreaksInput,
} from "../feasibility/break-intervals";
import {
  computeTheoreticalSlotCapacity,
  generateFeasibilityCandidateSlots,
} from "../feasibility/candidate-slots";
import {
  applyFeasibilitySlot,
  completeFeasibilitySearch,
  createFeasibilitySearchState,
  type FeasibilitySearchState,
} from "../feasibility/complete-search";
import { canPlaceFixtureOnSlot } from "../feasibility/constraints";
import { sortFixturesForScheduling, validateFeasibilityFixtureSet } from "../feasibility/fixture-validation";
import { buildFeasibilityMetrics } from "../feasibility/metrics";
import { buildTournamentPitchAvailability } from "../feasibility/pitch-availability";
import type { FeasibilityCandidateSlot, FeasibilitySchedulingConfig, TournamentFeasibilityInput } from "../feasibility/types";

export type WitnessScheduleOutcome = {
  ok: boolean;
  state: FeasibilitySearchState;
  candidateSlots: FeasibilityCandidateSlot[];
  metrics: ReturnType<typeof buildFeasibilityMetrics>;
};

function ms(minutes: number): number {
  return minutes * 60_000;
}

/**
 * Deterministic witness schedule using the same candidate slots + search as 01D.
 * Returns ok=false when structural pre-checks fail (does not prove INFEASIBLE alone).
 */
export function findFeasibilityWitnessSchedule(
  input: TournamentFeasibilityInput,
  config: FeasibilitySchedulingConfig,
): WitnessScheduleOutcome {
  const emptyState = createFeasibilitySearchState();
  if (
    input.participants.length > FEASIBILITY_MAX_PARTICIPANTS ||
    input.fixtures.length > FEASIBILITY_MAX_FIXTURES ||
    input.tournamentPitches.length > FEASIBILITY_MAX_PITCHES
  ) {
    const emptyMetrics = buildFeasibilityMetrics({
      fixtures: input.fixtures,
      tournamentPitches: [],
      tournamentWindow: input.tournamentWindow,
      config,
      candidateSlotCount: 0,
      theoreticalSlotCapacity: 0,
      participantMinRestSlackMinutes: null,
    });
    return { ok: false, state: emptyState, candidateSlots: [], metrics: emptyMetrics };
  }

  const emptyMetrics = buildFeasibilityMetrics({
    fixtures: input.fixtures,
    tournamentPitches: [],
    tournamentWindow: input.tournamentWindow,
    config,
    candidateSlotCount: 0,
    theoreticalSlotCapacity: 0,
    participantMinRestSlackMinutes: null,
  });

  const breakDiagnostics = validateTournamentBreaksInput({
    breaks: input.breaks,
    pitches: input.tournamentPitches,
    tournamentWindow: input.tournamentWindow,
  });
  if (breakDiagnostics.some((d) => d.code === "BREAK.INVALID" || d.code === "BREAK.UNKNOWN_PITCH")) {
    return { ok: false, state: emptyState, candidateSlots: [], metrics: emptyMetrics };
  }

  const blockedIntervalsByPitchId = buildBlockedIntervalsByPitchId({
    breaks: input.breaks,
    pitches: input.tournamentPitches,
    tournamentWindow: input.tournamentWindow,
  });

  const tournamentPitches = buildTournamentPitchAvailability({
    tournamentWindow: input.tournamentWindow,
    pitches: input.tournamentPitches,
    blockedIntervalsByPitchId,
  });

  const fixtureValidation = validateFeasibilityFixtureSet(input.fixtures, input.participants);
  if (!fixtureValidation.ok) {
    return { ok: false, state: emptyState, candidateSlots: [], metrics: emptyMetrics };
  }

  const candidateSlots = generateFeasibilityCandidateSlots(
    tournamentPitches,
    config,
    blockedIntervalsByPitchId,
  );

  const metrics = buildFeasibilityMetrics({
    fixtures: input.fixtures,
    tournamentPitches,
    tournamentWindow: input.tournamentWindow,
    config,
    candidateSlotCount: candidateSlots.length,
    theoreticalSlotCapacity: computeTheoreticalSlotCapacity(tournamentPitches, config),
    participantMinRestSlackMinutes: null,
  });

  const sortedFixtures = sortFixturesForScheduling(input.fixtures);
  const state = createFeasibilitySearchState();

  for (const locked of input.lockedAssignments ?? []) {
    const fixture = sortedFixtures.find((f) => f.fixtureId === locked.fixtureId);
    if (!fixture) continue;
    const matchMs = config.matchDurationMinutes * 60_000;
    const slot: FeasibilityCandidateSlot = {
      slotIndex: -1,
      tournamentPitchId: locked.tournamentPitchId,
      startUtcMs: locked.startUtcMs,
      resourceEndUtcMs: locked.startUtcMs + matchMs + ms(config.transitionMinutes),
      participantEndUtcMs: locked.startUtcMs + matchMs,
    };
    applyFeasibilitySlot(state, fixture.fixtureId, [fixture.sideAParticipantId, fixture.sideBParticipantId], slot);
  }

  const searchOk = completeFeasibilitySearch({
    fixtures: sortedFixtures,
    slots: candidateSlots,
    config,
    windowStart: input.tournamentWindow.startUtcMs,
    windowEnd: input.tournamentWindow.endUtcMs,
    state,
  });

  return {
    ok: searchOk,
    state,
    candidateSlots,
    metrics,
  };
}

export function witnessScheduleFinishUtcMs(state: FeasibilitySearchState): number | null {
  let maxEnd: number | null = null;
  for (const slot of state.assignments.values()) {
    if (maxEnd === null || slot.resourceEndUtcMs > maxEnd) {
      maxEnd = slot.resourceEndUtcMs;
    }
  }
  return maxEnd;
}
