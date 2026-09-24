import type { TrainingSessionStatus } from "@/lib/training/types";
import type { PersonalEventProjectionActor } from "./event-projection-access";
import { canActorReadEventType } from "./event-projection-access";

export type PersonalTrainingSessionAuthorizationRow = {
  id: string;
  tenantId: string;
  teamSeasonId: string;
  status: TrainingSessionStatus;
};

const HIDDEN_TRAINING_SESSION_STATUSES = new Set<TrainingSessionStatus>(["RECURRENCE_REMOVED"]);

/**
 * Canonical personal programme training visibility (authorization layer).
 * Call only after personal TeamSeason relevance is established for the row.
 *
 * Publication / website / infoboard flags must not gate this path.
 */
export function canIncludeTrainingSessionInPersonalProjection(
  actor: PersonalEventProjectionActor,
  session: PersonalTrainingSessionAuthorizationRow,
): boolean {
  if (session.tenantId !== actor.tenantId) {
    return false;
  }
  if (HIDDEN_TRAINING_SESSION_STATUSES.has(session.status)) {
    return false;
  }
  return canActorReadEventType(actor, "TRAINING");
}
