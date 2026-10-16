import { analyseTournamentFeasibility } from "../feasibility/analyse";
import { runTimingFeasibilityWithWitness } from "./feasibility-oracle";
import { minimumRequiredTournamentSpanMinutes } from "../feasibility/metrics";
import {
  computeEffectivePlayableCapacityFromFeasibilityInput,
  computeEffectivePlayableCapacityMinutes,
} from "./capacity";
import { recommendMatchAndTransitionDurations } from "./backward";
import {
  buildTimingNudges,
  mapFeasibilitySuggestionsToAdjustments,
} from "./nudges";
import {
  computeBreakOpportunity,
  computeMatchDurationIncreaseOpportunity,
  pitchCouldBeRemoved,
  recommendMinimumPitchCount,
} from "./opportunities";
import {
  buildTournamentFeasibilityInput,
  normalizeTimingConfig,
  openEndForwardWindow,
  resolveParticipantRestProofStatus,
  toFeasibilityFixtures,
} from "./prepare-context";
import type { TournamentTimingAssessment, TournamentTimingInput } from "./types";
import { witnessScheduleFinishUtcMs } from "./witness-schedule";

function windowSpanMinutes(window: { startUtcMs: number; endUtcMs: number }): number {
  return Math.max(0, Math.floor((window.endUtcMs - window.startUtcMs) / 60_000));
}

function structuralLowerBoundSpanMinutes(
  input: TournamentTimingInput,
  config: ReturnType<typeof normalizeTimingConfig>,
): number {
  const fixtures = toFeasibilityFixtures(input.fixtures);
  const slotOccupancy = config.matchDurationMinutes + config.transitionMinutes;
  const pitchCount = Math.max(1, input.tournamentPitches.length);
  const pitchMinuteBound =
    slotOccupancy > 0
      ? Math.ceil((fixtures.length * slotOccupancy) / pitchCount)
      : 0;
  const restBound = minimumRequiredTournamentSpanMinutes(fixtures, config);
  return Math.max(pitchMinuteBound, restBound);
}

const HEAVY_OPPORTUNITY_FIXTURE_LIMIT = 16;

function buildAssessmentShell(
  input: TournamentTimingInput,
  partial: Omit<
    TournamentTimingAssessment,
    | "mode"
    | "recommendationsAutoApplied"
  >,
): TournamentTimingAssessment {
  return {
    mode: input.mode,
    recommendationsAutoApplied: false,
    ...partial,
  };
}

export function assessTournamentTiming(input: TournamentTimingInput): TournamentTimingAssessment {
  const config = normalizeTimingConfig(input.config);
  const participantRestProofStatus = resolveParticipantRestProofStatus(input.fixtures);

  if (input.mode === "BACKWARD") {
    return assessBackwardTiming(input, config, participantRestProofStatus);
  }
  if (input.mode === "FIXED_ASSESSMENT") {
    return assessFixedWindowTiming(input, config, participantRestProofStatus);
  }
  return assessForwardTiming(input, config, participantRestProofStatus);
}

function assessForwardTiming(
  input: TournamentTimingInput,
  config: ReturnType<typeof normalizeTimingConfig>,
  participantRestProofStatus: TournamentTimingAssessment["participantRestProofStatus"],
): TournamentTimingAssessment {
  const slotOccupancy = config.matchDurationMinutes + config.transitionMinutes;
  const structuralFixtures = toFeasibilityFixtures(input.fixtures);
  const restBound = minimumRequiredTournamentSpanMinutes(structuralFixtures, config);

  const hasKnownEnd = input.endBoundaryKnown !== false;

  const tournamentWindow = hasKnownEnd
    ? input.tournamentWindow
    : openEndForwardWindow(
        input.tournamentWindow.startUtcMs,
        input.fixtures.length,
        input.tournamentPitches.length,
        slotOccupancy,
        restBound,
      );

  const feasibilityInput = buildTournamentFeasibilityInput(input, config, tournamentWindow);
  const { feasibility, witness } = runTimingFeasibilityWithWitness(feasibilityInput, config);

  const finishUtcMs =
    witness?.ok === true ? witnessScheduleFinishUtcMs(witness.state) : null;

  const requiredSpanMinutes =
    finishUtcMs !== null
      ? Math.ceil((finishUtcMs - input.tournamentWindow.startUtcMs) / 60_000)
      : structuralLowerBoundSpanMinutes(input, config);

  const requiredSpanKind =
    finishUtcMs !== null ? ("EXACT_WITNESS" as const) : ("STRUCTURAL_LOWER_BOUND" as const);

  const reserveMinutes =
    hasKnownEnd && finishUtcMs !== null
      ? Math.max(0, windowSpanMinutes(input.tournamentWindow) - requiredSpanMinutes)
      : null;

  const timingInputForOps = {
    ...input,
    tournamentWindow: hasKnownEnd ? input.tournamentWindow : tournamentWindow,
  };
  const heavyOpportunities = input.fixtures.length <= HEAVY_OPPORTUNITY_FIXTURE_LIMIT;
  const matchOpportunity = heavyOpportunities
    ? computeMatchDurationIncreaseOpportunity(timingInputForOps, config)
    : null;

  const breakOpportunity = computeBreakOpportunity(input, config, reserveMinutes);

  const pitchRec = heavyOpportunities
    ? recommendMinimumPitchCount(timingInputForOps, config)
    : {
        minimumProvenPitchCount: null,
        currentPitchCount: input.tournamentPitches.length,
        rationale: "Pitch-count proof skipped above interactive fixture threshold.",
      };

  const nudges = buildTimingNudges({
    feasibility,
    participantRestProofStatus,
    reserveMinutes,
    matchDurationOpportunityMinutes: matchOpportunity?.additionalMatchMinutes ?? null,
    breakOpportunityMinutes: breakOpportunity?.suggestedDurationMinutes ?? null,
    pitchCouldBeRemoved: heavyOpportunities
      ? pitchCouldBeRemoved(timingInputForOps, config)
      : false,
  });

  return buildAssessmentShell(input, {
    feasibilityStatus: feasibility.status,
    participantRestProofStatus,
    metrics: feasibility.metrics,
    effectivePlayableCapacityMinutes:
      computeEffectivePlayableCapacityFromFeasibilityInput(feasibilityInput),
    requiredSpanMinutes,
    requiredSpanKind,
    predictedFinishUtcMs: finishUtcMs,
    reserveMinutes,
    durationRecommendation: null,
    adjustments: mapFeasibilitySuggestionsToAdjustments(feasibility),
    nudges,
    pitchCountRecommendation: pitchRec,
    matchDurationOpportunity: matchOpportunity,
    breakOpportunity,
    diagnostics: feasibility.diagnostics,
  });
}

function assessBackwardTiming(
  input: TournamentTimingInput,
  config: ReturnType<typeof normalizeTimingConfig>,
  participantRestProofStatus: TournamentTimingAssessment["participantRestProofStatus"],
): TournamentTimingAssessment {
  const durationRecommendation = recommendMatchAndTransitionDurations(input);
  const trialConfig = durationRecommendation
    ? {
        matchDurationMinutes: durationRecommendation.matchDurationMinutes,
        transitionMinutes: durationRecommendation.transitionMinutes,
        minRestMinutes: config.minRestMinutes,
      }
    : config;

  const feasibilityInput = buildTournamentFeasibilityInput(input, trialConfig, input.tournamentWindow);
  const { feasibility, witness } = runTimingFeasibilityWithWitness(feasibilityInput, trialConfig);
  const finishUtcMs =
    witness?.ok === true ? witnessScheduleFinishUtcMs(witness.state) : null;

  const requiredSpanMinutes =
    finishUtcMs !== null
      ? Math.ceil((finishUtcMs - input.tournamentWindow.startUtcMs) / 60_000)
      : structuralLowerBoundSpanMinutes(input, trialConfig);

  const reserveMinutes =
    finishUtcMs !== null
      ? Math.max(0, windowSpanMinutes(input.tournamentWindow) - requiredSpanMinutes)
      : null;

  const heavyOpportunities = input.fixtures.length <= HEAVY_OPPORTUNITY_FIXTURE_LIMIT;
  const matchOpportunity =
    heavyOpportunities && !durationRecommendation
      ? computeMatchDurationIncreaseOpportunity(input, config)
      : null;

  const pitchRec = heavyOpportunities
    ? recommendMinimumPitchCount(input, trialConfig)
    : {
        minimumProvenPitchCount: null,
        currentPitchCount: input.tournamentPitches.length,
        rationale: "Pitch-count proof skipped above interactive fixture threshold.",
      };
  const breakOpportunity = computeBreakOpportunity(input, trialConfig, reserveMinutes);

  const nudges = buildTimingNudges({
    feasibility,
    participantRestProofStatus,
    reserveMinutes,
    matchDurationOpportunityMinutes: matchOpportunity?.additionalMatchMinutes ?? null,
    breakOpportunityMinutes: breakOpportunity?.suggestedDurationMinutes ?? null,
    pitchCouldBeRemoved: heavyOpportunities ? pitchCouldBeRemoved(input, trialConfig) : false,
  });

  return buildAssessmentShell(input, {
    feasibilityStatus: feasibility.status,
    participantRestProofStatus,
    metrics: feasibility.metrics,
    effectivePlayableCapacityMinutes:
      computeEffectivePlayableCapacityFromFeasibilityInput(feasibilityInput),
    requiredSpanMinutes,
    requiredSpanKind: finishUtcMs !== null ? "EXACT_WITNESS" : "STRUCTURAL_LOWER_BOUND",
    predictedFinishUtcMs: finishUtcMs,
    reserveMinutes,
    durationRecommendation,
    adjustments: mapFeasibilitySuggestionsToAdjustments(feasibility),
    nudges,
    pitchCountRecommendation: pitchRec,
    matchDurationOpportunity: matchOpportunity,
    breakOpportunity,
    diagnostics: feasibility.diagnostics,
  });
}

function assessFixedWindowTiming(
  input: TournamentTimingInput,
  config: ReturnType<typeof normalizeTimingConfig>,
  participantRestProofStatus: TournamentTimingAssessment["participantRestProofStatus"],
): TournamentTimingAssessment {
  const feasibilityInput = buildTournamentFeasibilityInput(input, config, input.tournamentWindow);
  const { feasibility, witness } = runTimingFeasibilityWithWitness(feasibilityInput, config);

  const finishUtcMs =
    witness?.ok === true ? witnessScheduleFinishUtcMs(witness.state) : null;

  const requiredSpanMinutes =
    finishUtcMs !== null
      ? Math.ceil((finishUtcMs - input.tournamentWindow.startUtcMs) / 60_000)
      : structuralLowerBoundSpanMinutes(input, config);

  const reserveMinutes =
    finishUtcMs !== null
      ? Math.max(0, windowSpanMinutes(input.tournamentWindow) - requiredSpanMinutes)
      : null;

  let durationRecommendation = null;
  if (feasibility.status === "INFEASIBLE") {
    durationRecommendation = recommendMatchAndTransitionDurations(input);
  }

  const heavyOpportunities = input.fixtures.length <= HEAVY_OPPORTUNITY_FIXTURE_LIMIT;
  const matchOpportunity = heavyOpportunities
    ? computeMatchDurationIncreaseOpportunity(input, config)
    : null;
  const pitchRec = heavyOpportunities
    ? recommendMinimumPitchCount(input, config)
    : {
        minimumProvenPitchCount: null,
        currentPitchCount: input.tournamentPitches.length,
        rationale: "Pitch-count proof skipped above interactive fixture threshold.",
      };
  const breakOpportunity = computeBreakOpportunity(input, config, reserveMinutes);

  const nudges = buildTimingNudges({
    feasibility,
    participantRestProofStatus,
    reserveMinutes,
    matchDurationOpportunityMinutes: matchOpportunity?.additionalMatchMinutes ?? null,
    breakOpportunityMinutes: breakOpportunity?.suggestedDurationMinutes ?? null,
    pitchCouldBeRemoved: heavyOpportunities ? pitchCouldBeRemoved(input, config) : false,
  });

  return buildAssessmentShell(input, {
    feasibilityStatus: feasibility.status,
    participantRestProofStatus,
    metrics: feasibility.metrics,
    effectivePlayableCapacityMinutes:
      computeEffectivePlayableCapacityFromFeasibilityInput(feasibilityInput),
    requiredSpanMinutes,
    requiredSpanKind: finishUtcMs !== null ? "EXACT_WITNESS" : "STRUCTURAL_LOWER_BOUND",
    predictedFinishUtcMs: finishUtcMs,
    reserveMinutes,
    durationRecommendation,
    adjustments: mapFeasibilitySuggestionsToAdjustments(feasibility),
    nudges,
    pitchCountRecommendation: pitchRec,
    matchDurationOpportunity: matchOpportunity,
    breakOpportunity,
    diagnostics: feasibility.diagnostics,
  });
}

export { computeEffectivePlayableCapacityMinutes } from "./capacity";
