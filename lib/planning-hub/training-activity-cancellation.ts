/**
 * SCE-PLANNER-UX-08-07R4 — per-training cancellation eligibility in planning hub.
 * Activity actions depend on the selected TRAINING item only (never conflicts or matches).
 */

import type { ManipulationActorPermissions } from "@/lib/planning-hub/manipulation-server-authorization";
import type { WeekplannerItem, WeekplannerTrainingItem } from "@/lib/weekplanner/types";

export function isWeekplannerTrainingItem(item: WeekplannerItem): item is WeekplannerTrainingItem {
  return item.type === "TRAINING";
}

/**
 * Canonical planner UI gate for cancelling one training occurrence.
 * Cancelled sessions are excluded from the weekplanner read model; lifecycle validation
 * remains authoritative on PATCH /api/training-sessions/[sessionId].
 */
export function canCancelTrainingActivity(
  item: WeekplannerItem,
  actor: ManipulationActorPermissions,
): item is WeekplannerTrainingItem {
  if (!isWeekplannerTrainingItem(item)) return false;
  if (!actor.canManageTrainings) return false;
  const sessionId = item.trainingSessionId?.trim();
  return !!sessionId;
}
