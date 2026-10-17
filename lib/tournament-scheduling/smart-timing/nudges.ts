import { TIGHT_CAPACITY_UTILISATION_THRESHOLD } from "../feasibility/constants";
import type { TournamentFeasibilityResult } from "../feasibility/types";
import { POSITIVE_RESERVE_NUDGE_THRESHOLD_MINUTES } from "./constants";
import type {
  ParticipantRestProofStatus,
  TimingNudge,
  TimingNudgeCode,
  TournamentTimingAssessment,
} from "./types";

function nudge(
  code: TimingNudgeCode,
  polarity: TimingNudge["polarity"],
  context?: TimingNudge["context"],
): TimingNudge {
  return { code, polarity, context };
}

export function buildTimingNudges(params: {
  feasibility: TournamentFeasibilityResult;
  participantRestProofStatus: ParticipantRestProofStatus;
  reserveMinutes: number | null;
  matchDurationOpportunityMinutes: number | null;
  breakOpportunityMinutes: number | null;
  pitchCouldBeRemoved: boolean;
}): TimingNudge[] {
  const nudges: TimingNudge[] = [];
  const { feasibility, participantRestProofStatus } = params;

  if (participantRestProofStatus === "UNRESOLVED" || participantRestProofStatus === "PARTIAL") {
    nudges.push(nudge("UNRESOLVED_PARTICIPANT_REST", "CORRECTIVE"));
  }

  if (feasibility.status === "TIGHT") {
    nudges.push(
      nudge("TIME_WINDOW_TIGHT", "CORRECTIVE", {
        capacityUtilisation: feasibility.metrics.capacityUtilisation,
        threshold: TIGHT_CAPACITY_UTILISATION_THRESHOLD,
      }),
    );
  }

  for (const suggestion of feasibility.suggestions) {
    if (suggestion.code === "EXTEND_TOURNAMENT_WINDOW") {
      nudges.push(nudge("EXTEND_END_TIME", "CORRECTIVE", suggestion.context));
    }
    if (suggestion.code === "ADD_TOURNAMENT_PITCH") {
      nudges.push(nudge("ADD_TOURNAMENT_PITCH", "CORRECTIVE", suggestion.context));
    }
    if (suggestion.code === "REDUCE_MATCH_DURATION") {
      nudges.push(nudge("REDUCE_MATCH_DURATION", "CORRECTIVE", suggestion.context));
    }
    if (suggestion.code === "REDUCE_TRANSITION_DURATION") {
      nudges.push(nudge("REDUCE_TRANSITION_DURATION", "CORRECTIVE", suggestion.context));
    }
    if (suggestion.code === "REDUCE_MINIMUM_REST") {
      nudges.push(nudge("MINIMUM_REST_CONSTRAINT", "CORRECTIVE", suggestion.context));
    }
  }

  for (const diagnostic of feasibility.diagnostics) {
    if (diagnostic.code.startsWith("BREAK.")) {
      nudges.push(nudge("BREAK_REDUCES_CAPACITY", "CORRECTIVE", diagnostic.context));
    }
  }

  if (
    params.reserveMinutes !== null &&
    params.reserveMinutes >= POSITIVE_RESERVE_NUDGE_THRESHOLD_MINUTES
  ) {
    nudges.push(
      nudge("RESERVE_REMAINS", "POSITIVE", { reserveMinutes: params.reserveMinutes }),
    );
  }

  if (params.matchDurationOpportunityMinutes !== null && params.matchDurationOpportunityMinutes > 0) {
    nudges.push(
      nudge("LONGER_MATCHES_POSSIBLE", "POSITIVE", {
        additionalMatchMinutes: params.matchDurationOpportunityMinutes,
      }),
    );
  }

  if (params.breakOpportunityMinutes !== null && params.breakOpportunityMinutes > 0) {
    nudges.push(
      nudge("BREAK_COULD_FIT", "POSITIVE", {
        suggestedBreakMinutes: params.breakOpportunityMinutes,
      }),
    );
  }

  if (params.pitchCouldBeRemoved) {
    nudges.push(nudge("PITCH_COULD_BE_REMOVED", "POSITIVE"));
  }

  const seen = new Set<string>();
  return nudges.filter((item) => {
    const key = `${item.polarity}:${item.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mapFeasibilitySuggestionsToAdjustments(
  feasibility: TournamentFeasibilityResult,
): TournamentTimingAssessment["adjustments"] {
  return feasibility.suggestions.map((s) => {
    switch (s.code) {
      case "EXTEND_TOURNAMENT_WINDOW":
        return { code: "EXTEND_TOURNAMENT_END" as const, context: s.context };
      case "ADD_TOURNAMENT_PITCH":
        return { code: "ADD_TOURNAMENT_PITCH" as const, context: s.context };
      case "REDUCE_MATCH_DURATION":
        return { code: "REDUCE_MATCH_DURATION" as const, context: s.context };
      case "REDUCE_TRANSITION_DURATION":
        return { code: "REDUCE_TRANSITION_DURATION" as const, context: s.context };
      case "REDUCE_MINIMUM_REST":
        return { code: "REDUCE_MINIMUM_REST" as const, context: s.context };
      default:
        return { code: "REDUCE_MATCH_DURATION" as const, context: s.context };
    }
  });
}
