import { exceedsCompleteFeasibilitySearchBounds } from "./bounds";
import {
  FEASIBILITY_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS,
  FEASIBILITY_DEFAULT_MIN_REST_MINUTES,
  FEASIBILITY_DEFAULT_TRANSITION_MINUTES,
  TIGHT_CAPACITY_UTILISATION_THRESHOLD,
} from "./constants";
import {
  computeTheoreticalSlotCapacity,
  generateFeasibilityCandidateSlots,
} from "./candidate-slots";
import { canPlaceFixtureOnSlot, slotWithinTournamentWindow } from "./constraints";
import { sortFixturesForScheduling, validateFeasibilityFixtureSet } from "./fixture-validation";
import { buildFeasibilityMetrics } from "./metrics";
import {
  buildBlockedIntervalsByPitchId,
  validateTournamentBreaksInput,
} from "./break-intervals";
import { buildTournamentPitchAvailability } from "./pitch-availability";
import {
  applyFeasibilitySlot,
  completeFeasibilitySearch,
  createFeasibilitySearchState,
} from "./complete-search";
import type {
  FeasibilityCandidateSlot,
  FeasibilityDiagnostic,
  FeasibilitySuggestion,
  TournamentFeasibilityInput,
  TournamentFeasibilityResult,
} from "./types";

function ms(minutes: number): number {
  return minutes * 60_000;
}

function buildSuggestions(
  diagnostics: readonly FeasibilityDiagnostic[],
  metrics: TournamentFeasibilityResult["metrics"],
  config: TournamentFeasibilityInput["config"],
): FeasibilitySuggestion[] {
  const suggestions: FeasibilitySuggestion[] = [];
  const codes = new Set(diagnostics.map((d) => d.code));

  if (
    codes.has("CAPACITY.PITCH_MINUTES_SHORT") ||
    codes.has("CAPACITY.INSUFFICIENT_PARALLEL_PITCHES") ||
    metrics.capacityUtilisation >= TIGHT_CAPACITY_UTILISATION_THRESHOLD
  ) {
    suggestions.push({
      code: "ADD_TOURNAMENT_PITCH",
      context: {
        tournamentPitchCount: metrics.tournamentPitchCount,
        fixtureCount: metrics.fixtureCount,
      },
    });
  }
  if (codes.has("CAPACITY.WINDOW_TOO_SHORT") || codes.has("REST.CANNOT_SATISFY_MIN_REST")) {
    suggestions.push({
      code: "EXTEND_TOURNAMENT_WINDOW",
      context: {
        minimumRequiredTournamentSpanMinutes: metrics.minimumRequiredTournamentSpanMinutes,
      },
    });
  }
  if (codes.has("CAPACITY.PITCH_MINUTES_SHORT")) {
    suggestions.push({
      code: "REDUCE_MATCH_DURATION",
      context: { matchDurationMinutes: config.matchDurationMinutes },
    });
    suggestions.push({
      code: "REDUCE_TRANSITION_DURATION",
      context: { transitionMinutes: config.transitionMinutes },
    });
  }
  if (codes.has("REST.CANNOT_SATISFY_MIN_REST")) {
    suggestions.push({
      code: "REDUCE_MINIMUM_REST",
      context: { minRestMinutes: config.minRestMinutes },
    });
  }

  const seen = new Set<string>();
  return suggestions.filter((s) => {
    if (seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  });
}

function classifyTight(metrics: TournamentFeasibilityResult["metrics"]): boolean {
  if (metrics.capacityUtilisation >= TIGHT_CAPACITY_UTILISATION_THRESHOLD) return true;
  if (metrics.participantMinRestSlackMinutes === 0) return true;
  if (
    metrics.theoreticalSlotCapacity > 0 &&
    metrics.fixtureCount >= metrics.theoreticalSlotCapacity
  ) {
    return true;
  }
  return false;
}

function computeParticipantMinRestSlack(
  state: ReturnType<typeof createFeasibilitySearchState>,
  config: TournamentFeasibilityInput["config"],
): number | null {
  let minSlack: number | null = null;
  for (const bookings of state.participantBookings.values()) {
    const sorted = [...bookings].sort((a, b) => a.startUtcMs - b.startUtcMs);
    for (let i = 1; i < sorted.length; i += 1) {
      const gapMs = sorted[i].startUtcMs - sorted[i - 1].participantEndUtcMs;
      const slackMinutes = Math.floor(gapMs / 60_000) - config.minRestMinutes;
      if (minSlack === null || slackMinutes < minSlack) {
        minSlack = slackMinutes;
      }
    }
  }
  return minSlack;
}

function validateLockedAssignments(
  input: TournamentFeasibilityInput,
  pitches: readonly { tournamentPitchId: string }[],
  slots: readonly FeasibilityCandidateSlot[],
  config: TournamentFeasibilityInput["config"],
): FeasibilityDiagnostic[] {
  const diagnostics: FeasibilityDiagnostic[] = [];
  const slotByKey = new Map<string, FeasibilityCandidateSlot>();
  for (const slot of slots) {
    slotByKey.set(`${slot.tournamentPitchId}\0${slot.startUtcMs}`, slot);
  }

  const pitchIds = new Set(pitches.map((p) => p.tournamentPitchId));

  for (const locked of input.lockedAssignments ?? []) {
    if (!pitchIds.has(locked.tournamentPitchId)) {
      diagnostics.push({
        code: "LOCKS.CONFLICTING",
        constraintId: "H6",
        context: { fixtureId: locked.fixtureId, tournamentPitchId: locked.tournamentPitchId },
      });
      continue;
    }

    const matchMs = config.matchDurationMinutes * 60_000;
    const resourceEnd = locked.startUtcMs + matchMs + ms(config.transitionMinutes);
    if (
      !slotWithinTournamentWindow(input.tournamentWindow.startUtcMs, input.tournamentWindow.endUtcMs, {
        startUtcMs: locked.startUtcMs,
        resourceEndUtcMs: resourceEnd,
      })
    ) {
      diagnostics.push({
        code: "LOCKS.CONFLICTING",
        constraintId: "H5",
        context: { fixtureId: locked.fixtureId },
      });
    }

    const matchingSlot = slotByKey.get(`${locked.tournamentPitchId}\0${locked.startUtcMs}`);
    if (!matchingSlot) {
      diagnostics.push({
        code: "LOCKS.CONFLICTING",
        constraintId: "H10",
        context: { fixtureId: locked.fixtureId, tournamentPitchId: locked.tournamentPitchId },
      });
    }
  }

  return diagnostics;
}

function infeasibleResult(
  diagnostics: FeasibilityDiagnostic[],
  metrics: TournamentFeasibilityResult["metrics"],
  config: TournamentFeasibilityInput["config"],
): TournamentFeasibilityResult {
  return {
    status: "INFEASIBLE",
    diagnostics,
    metrics,
    suggestions: buildSuggestions(diagnostics, metrics, config),
  };
}

function unresolvedResult(
  diagnostics: FeasibilityDiagnostic[],
  metrics: TournamentFeasibilityResult["metrics"],
  config: TournamentFeasibilityInput["config"],
): TournamentFeasibilityResult {
  return {
    status: "UNRESOLVED",
    diagnostics,
    metrics,
    suggestions: buildSuggestions(diagnostics, metrics, config),
  };
}

function emptyMetrics(
  input: TournamentFeasibilityInput,
  config: TournamentFeasibilityInput["config"],
): TournamentFeasibilityResult["metrics"] {
  return buildFeasibilityMetrics({
    fixtures: input.fixtures,
    tournamentPitches: [],
    tournamentWindow: input.tournamentWindow,
    config,
    candidateSlotCount: 0,
    theoreticalSlotCapacity: 0,
    participantMinRestSlackMinutes: null,
  });
}

/**
 * Pure feasibility analysis — answers whether fixtures CAN fit (01D).
 * Does not persist assignments or optimise soft objectives (01E).
 */
export function analyseTournamentFeasibility(
  input: TournamentFeasibilityInput,
): TournamentFeasibilityResult {
  const config = {
    matchDurationMinutes: input.config.matchDurationMinutes,
    transitionMinutes: input.config.transitionMinutes ?? FEASIBILITY_DEFAULT_TRANSITION_MINUTES,
    minRestMinutes: input.config.minRestMinutes ?? FEASIBILITY_DEFAULT_MIN_REST_MINUTES,
  };

  const diagnostics: FeasibilityDiagnostic[] = [];

  const breakDiagnostics = validateTournamentBreaksInput({
    breaks: input.breaks,
    pitches: input.tournamentPitches.map((p) => ({
      tournamentPitchId: p.tournamentPitchId,
      displayOrder: p.displayOrder,
      label: p.label,
      playableIntervals: [],
    })),
    tournamentWindow: input.tournamentWindow,
  });
  if (breakDiagnostics.some((d) => d.code === "BREAK.INVALID" || d.code === "BREAK.UNKNOWN_PITCH")) {
    return infeasibleResult(breakDiagnostics, emptyMetrics(input, config), config);
  }

  const blockedIntervalsByPitchId = buildBlockedIntervalsByPitchId({
    breaks: input.breaks,
    pitches: input.tournamentPitches.map((p) => ({
      tournamentPitchId: p.tournamentPitchId,
      displayOrder: p.displayOrder,
      label: p.label,
      playableIntervals: [],
    })),
    tournamentWindow: input.tournamentWindow,
  });

  const tournamentPitches = buildTournamentPitchAvailability({
    tournamentWindow: input.tournamentWindow,
    pitches: input.tournamentPitches,
    blockedIntervalsByPitchId,
  });

  const fixtureValidation = validateFeasibilityFixtureSet(input.fixtures, input.participants);
  if (!fixtureValidation.ok) {
    const metrics = buildFeasibilityMetrics({
      fixtures: input.fixtures,
      tournamentPitches,
      tournamentWindow: input.tournamentWindow,
      config,
      candidateSlotCount: 0,
      theoreticalSlotCapacity: 0,
      participantMinRestSlackMinutes: null,
    });
    return infeasibleResult(fixtureValidation.diagnostics, metrics, config);
  }

  const windowSpanMinutes = Math.floor(
    (input.tournamentWindow.endUtcMs - input.tournamentWindow.startUtcMs) / 60_000,
  );
  if (windowSpanMinutes <= 0) {
    diagnostics.push({ code: "CAPACITY.WINDOW_TOO_SHORT", constraintId: "H5" });
  }

  const theoreticalSlotCapacity = computeTheoreticalSlotCapacity(tournamentPitches, config);
  const candidateSlots = generateFeasibilityCandidateSlots(
    tournamentPitches,
    config,
    blockedIntervalsByPitchId,
  );

  let metrics = buildFeasibilityMetrics({
    fixtures: input.fixtures,
    tournamentPitches,
    tournamentWindow: input.tournamentWindow,
    config,
    candidateSlotCount: candidateSlots.length,
    theoreticalSlotCapacity,
    participantMinRestSlackMinutes: null,
  });

  if (candidateSlots.length > FEASIBILITY_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS) {
    diagnostics.push({
      code: "SLOTS.TOO_MANY_CANDIDATES",
      constraintId: "H9",
      context: {
        candidateSlotCount: candidateSlots.length,
        max: FEASIBILITY_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS,
      },
    });
    return unresolvedResult(diagnostics, metrics, config);
  }

  if (metrics.requiredPitchOccupancyMinutes > metrics.availableTournamentPitchMinutes) {
    diagnostics.push({
      code: "CAPACITY.PITCH_MINUTES_SHORT",
      constraintId: "H2",
      context: {
        requiredPitchOccupancyMinutes: metrics.requiredPitchOccupancyMinutes,
        availableTournamentPitchMinutes: metrics.availableTournamentPitchMinutes,
      },
    });
  }

  if (metrics.minimumRequiredTournamentSpanMinutes > windowSpanMinutes) {
    diagnostics.push({
      code: "REST.CANNOT_SATISFY_MIN_REST",
      constraintId: "H4",
      context: {
        minimumRequiredTournamentSpanMinutes: metrics.minimumRequiredTournamentSpanMinutes,
        windowSpanMinutes,
      },
    });
  }

  if (metrics.maxFixturesInSingleRound > metrics.tournamentPitchCount) {
    diagnostics.push({
      code: "CAPACITY.INSUFFICIENT_PARALLEL_PITCHES",
      constraintId: "H2",
      context: {
        maxFixturesInSingleRound: metrics.maxFixturesInSingleRound,
        tournamentPitchCount: metrics.tournamentPitchCount,
      },
    });
  }

  if (input.tournamentPitches.length === 0 && input.fixtures.length > 0) {
    diagnostics.push({ code: "PITCH.UNAVAILABLE", constraintId: "H6" });
  }

  const lockDiagnostics = validateLockedAssignments(input, tournamentPitches, candidateSlots, config);
  diagnostics.push(...lockDiagnostics);

  if (diagnostics.length > 0) {
    return infeasibleResult(diagnostics, metrics, config);
  }

  if (exceedsCompleteFeasibilitySearchBounds(input)) {
    return unresolvedResult(
      [
        {
          code: "ANALYSIS.COMPLETE_SEARCH_BOUNDARY",
          context: {
            fixtureCount: input.fixtures.length,
            tournamentPitchCount: input.tournamentPitches.length,
          },
        },
      ],
      metrics,
      config,
    );
  }

  const sortedFixtures = sortFixturesForScheduling(input.fixtures);
  const fixtureById = new Map(sortedFixtures.map((f) => [f.fixtureId, f]));

  const state = createFeasibilitySearchState();

  for (const locked of input.lockedAssignments ?? []) {
    const fixture = fixtureById.get(locked.fixtureId);
    if (!fixture) {
      diagnostics.push({
        code: "LOCKS.CONFLICTING",
        constraintId: "H7",
        context: { fixtureId: locked.fixtureId, reason: "UNKNOWN_FIXTURE" },
      });
      continue;
    }
    const matchMs = config.matchDurationMinutes * 60_000;
    const slot: FeasibilityCandidateSlot = {
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
      diagnostics.push({
        code: "LOCKS.CONFLICTING",
        constraintId: "H7",
        context: { fixtureId: locked.fixtureId },
      });
      continue;
    }
    applyFeasibilitySlot(state, fixture.fixtureId, participantIds, slot);
  }

  if (diagnostics.length > 0) {
    return infeasibleResult(diagnostics, metrics, config);
  }

  const searchOk = completeFeasibilitySearch({
    fixtures: sortedFixtures,
    slots: candidateSlots,
    config,
    windowStart: input.tournamentWindow.startUtcMs,
    windowEnd: input.tournamentWindow.endUtcMs,
    state,
  });

  const participantMinRestSlackMinutes = searchOk
    ? computeParticipantMinRestSlack(state, config)
    : null;

  metrics = buildFeasibilityMetrics({
    fixtures: input.fixtures,
    tournamentPitches,
    tournamentWindow: input.tournamentWindow,
    config,
    candidateSlotCount: candidateSlots.length,
    theoreticalSlotCapacity,
    participantMinRestSlackMinutes,
  });

  if (!searchOk) {
    diagnostics.push({
      code: "ASSIGNMENT.SEARCH_EXHAUSTED",
      constraintId: "H12",
      context: { fixtureCount: metrics.fixtureCount, search: "COMPLETE" },
    });
    return infeasibleResult(diagnostics, metrics, config);
  }

  const tight = classifyTight(metrics);
  return {
    status: tight ? "TIGHT" : "FEASIBLE",
    diagnostics: [],
    metrics,
    suggestions: tight ? buildSuggestions([], metrics, config) : [],
  };
}
