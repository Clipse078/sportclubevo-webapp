/**
 * SCE-COLLAB-01B-R2 — merge mutation collaboration with unresolved cycle baseline.
 */

import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import type { ActivityCollaborationMutationResult } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import type {
  MatchCollaborationCycleBaseline,
  TournamentCollaborationCycleBaseline,
  TrainingCollaborationCycleBaseline,
} from "@/lib/collaboration/activity-change/cycle-baseline";

type AnyCycleBaseline =
  | MatchCollaborationCycleBaseline
  | TournamentCollaborationCycleBaseline
  | TrainingCollaborationCycleBaseline;

export function finalizeCollaborationMutationCycle<TBaseline extends AnyCycleBaseline>(input: {
  cycleRequested: boolean;
  impact: ActivityChangeImpact | null;
  cycleBaseline: TBaseline | null;
  initialCycleBaseline: TBaseline | null;
}): ActivityCollaborationMutationResult {
  const worthy = Boolean(input.impact?.worthy && input.impact.changeSet);

  if (worthy && input.impact) {
    return {
      impact: input.impact,
      cycleBaseline: (input.cycleBaseline ?? input.initialCycleBaseline) as AnyCycleBaseline,
    };
  }

  if (input.cycleRequested) {
    return { impact: null, cycleBaseline: null };
  }

  return { impact: null, cycleBaseline: null };
}
