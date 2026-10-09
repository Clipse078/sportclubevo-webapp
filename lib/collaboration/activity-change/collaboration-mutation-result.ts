/**
 * SCE-COLLAB-01B-R2 — collaboration payload returned from activity mutations.
 */

import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import type {
  MatchCollaborationCycleBaseline,
  TournamentCollaborationCycleBaseline,
  TrainingCollaborationCycleBaseline,
} from "@/lib/collaboration/activity-change/cycle-baseline";

export type ActivityCollaborationMutationResult = {
  impact: ActivityChangeImpact | null;
  /** Canonical baseline for the active unresolved cycle; null when cycle clears. */
  cycleBaseline:
    | MatchCollaborationCycleBaseline
    | TournamentCollaborationCycleBaseline
    | TrainingCollaborationCycleBaseline
    | null;
};

export function buildCollaborationMutationResponse(
  result: ActivityCollaborationMutationResult,
): {
  collaboration: ActivityChangeImpact | null;
  collaborationCycleBaseline: ActivityCollaborationMutationResult["cycleBaseline"];
} {
  return {
    collaboration: result.impact,
    collaborationCycleBaseline: result.cycleBaseline,
  };
}
