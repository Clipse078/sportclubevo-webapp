import { resolveFixtureSidesForFeasibility } from "../competition-structure/unresolved-fixture-feasibility";
import {
  FEASIBILITY_DEFAULT_MIN_REST_MINUTES,
  FEASIBILITY_DEFAULT_TRANSITION_MINUTES,
} from "../feasibility/constants";
import { FORWARD_OPEN_END_HORIZON_MINUTES } from "./constants";
import type {
  FeasibilityFixtureRef,
  FeasibilityParticipantRef,
  FeasibilitySchedulingConfig,
  TournamentFeasibilityInput,
} from "../feasibility/types";
import type {
  ParticipantRestProofStatus,
  TournamentTimingFixtureRef,
  TournamentTimingInput,
} from "./types";

const STRUCTURAL_PREFIX = "__SCE_TIMING_STRUCT__";

export function normalizeTimingConfig(
  config: FeasibilitySchedulingConfig,
): FeasibilitySchedulingConfig {
  return {
    matchDurationMinutes: config.matchDurationMinutes,
    transitionMinutes: config.transitionMinutes ?? FEASIBILITY_DEFAULT_TRANSITION_MINUTES,
    minRestMinutes: config.minRestMinutes ?? FEASIBILITY_DEFAULT_MIN_REST_MINUTES,
  };
}

function fixtureUsesStructuralRest(fixture: TournamentTimingFixtureRef): boolean {
  if (fixture.sideSources && fixture.sideSources.length > 0) {
    if (
      fixture.sideSources.some(
        (s) =>
          s.sourceType === "QUALIFICATION_REFERENCE" || s.sourceType === "WINNER_OF_FIXTURE",
      )
    ) {
      return true;
    }
    const resolution = resolveFixtureSidesForFeasibility({
      sideAParticipantId: fixture.sideAParticipantId,
      sideBParticipantId: fixture.sideBParticipantId,
      sideSources: fixture.sideSources.filter(
        (s) => s.sourceType !== "WINNER_OF_FIXTURE",
      ) as {
        side: "A" | "B";
        sourceType: "CONCRETE_PARTICIPANT" | "QUALIFICATION_REFERENCE";
        participantId: string | null;
      }[],
    });
    return resolution.hasUnresolvedSide;
  }
  return false;
}

export function resolveParticipantRestProofStatus(
  fixtures: readonly TournamentTimingFixtureRef[],
): ParticipantRestProofStatus {
  if (fixtures.length === 0) return "UNRESOLVED";
  let structural = 0;
  let concrete = 0;
  for (const fixture of fixtures) {
    if (fixtureUsesStructuralRest(fixture)) structural += 1;
    else concrete += 1;
  }
  if (structural === 0) return "PROVEN";
  if (concrete === 0) return "UNRESOLVED";
  return "PARTIAL";
}

/** Map timing fixtures to feasibility refs without fabricating cross-fixture rest for unknown teams. */
export function toFeasibilityFixtures(
  fixtures: readonly TournamentTimingFixtureRef[],
): FeasibilityFixtureRef[] {
  return fixtures.map((fixture) => {
    if (!fixtureUsesStructuralRest(fixture)) {
      return {
        fixtureId: fixture.fixtureId,
        stageKey: fixture.stageKey,
        tournamentGroupId: fixture.tournamentGroupId,
        roundIndex: fixture.roundIndex,
        slotIndexInRound: fixture.slotIndexInRound,
        sideAParticipantId: fixture.sideAParticipantId,
        sideBParticipantId: fixture.sideBParticipantId,
      };
    }
    return {
      fixtureId: fixture.fixtureId,
      stageKey: fixture.stageKey,
      tournamentGroupId: fixture.tournamentGroupId,
      roundIndex: fixture.roundIndex,
      slotIndexInRound: fixture.slotIndexInRound,
      sideAParticipantId: `${STRUCTURAL_PREFIX}${fixture.fixtureId}:A`,
      sideBParticipantId: `${STRUCTURAL_PREFIX}${fixture.fixtureId}:B`,
    };
  });
}

export function buildFeasibilityParticipants(
  timingParticipants: readonly FeasibilityParticipantRef[],
  feasibilityFixtures: readonly FeasibilityFixtureRef[],
): FeasibilityParticipantRef[] {
  const ids = new Set(timingParticipants.map((p) => p.participantId));
  for (const fixture of feasibilityFixtures) {
    ids.add(fixture.sideAParticipantId);
    ids.add(fixture.sideBParticipantId);
  }
  return [...ids].map((participantId) => ({ participantId }));
}

export function buildTournamentFeasibilityInput(
  input: TournamentTimingInput,
  config: FeasibilitySchedulingConfig,
  tournamentWindow: TournamentFeasibilityInput["tournamentWindow"],
): TournamentFeasibilityInput {
  const feasibilityFixtures = toFeasibilityFixtures(input.fixtures);
  return {
    tournamentWindow,
    config,
    fixtures: feasibilityFixtures,
    participants: buildFeasibilityParticipants(input.participants, feasibilityFixtures),
    tournamentPitches: input.tournamentPitches.map((p) => ({
      ...p,
      playableIntervals: [],
    })),
    breaks: [...input.breaks],
    lockedAssignments: input.lockedAssignments ? [...input.lockedAssignments] : undefined,
  };
}

export function openEndForwardWindow(
  startUtcMs: number,
  fixtureCount: number,
  pitchCount: number,
  slotOccupancyMinutes: number,
  minimumRequiredSpanMinutes: number,
): { startUtcMs: number; endUtcMs: number } {
  const structuralMinutes = Math.max(
    minimumRequiredSpanMinutes,
    pitchCount > 0 && slotOccupancyMinutes > 0
      ? Math.ceil((fixtureCount * slotOccupancyMinutes) / Math.max(1, pitchCount))
      : 0,
  );
  const horizonMinutes = Math.max(
    FORWARD_OPEN_END_HORIZON_MINUTES,
    structuralMinutes * 2 + 60,
  );
  return {
    startUtcMs,
    endUtcMs: startUtcMs + horizonMinutes * 60_000,
  };
}
