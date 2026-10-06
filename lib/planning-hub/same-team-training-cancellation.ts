/**
 * SCE-PLANNER-UX-08-07R3 — same canonical TeamSeason TRAINING vs MATCH conflict shortcut.
 * Uses weekplanner read-model identities only (never display labels).
 */

import { weekplannerItemTeamSeasonIds } from "@/lib/planning-hub/team-filter";
import type { ManipulationActorPermissions } from "@/lib/planning-hub/manipulation-server-authorization";
import type {
  WeekplannerConflict,
  WeekplannerItem,
  WeekplannerMatchItem,
  WeekplannerTrainingItem,
} from "@/lib/weekplanner/types";

export type SameTeamTrainingCancellationOffer = {
  training: WeekplannerTrainingItem;
  match: WeekplannerMatchItem;
};

export function activityEffectiveTimesOverlap(a: WeekplannerItem, b: WeekplannerItem): boolean {
  return a.startAt.getTime() < b.endAt.getTime() && b.startAt.getTime() < a.endAt.getTime();
}

export function sameCanonicalTeamSeasonId(
  training: WeekplannerTrainingItem,
  match: WeekplannerMatchItem,
): boolean {
  const trainingTeamSeasonId = training.teamSeasonId?.trim();
  if (!trainingTeamSeasonId) return false;
  const matchTeamSeasonIds = weekplannerItemTeamSeasonIds(match);
  return matchTeamSeasonIds.length === 1 && matchTeamSeasonIds[0] === trainingTeamSeasonId;
}

export function pairTrainingAndMatch(
  a: WeekplannerItem,
  b: WeekplannerItem,
): SameTeamTrainingCancellationOffer | null {
  if (a.type === "TRAINING" && b.type === "MATCH") {
    return { training: a, match: b };
  }
  if (a.type === "MATCH" && b.type === "TRAINING") {
    return { training: b, match: a };
  }
  return null;
}

/**
 * High-confidence operational resolution: one TRAINING and one MATCH for the same
 * TeamSeason with overlapping effective activity times (not label heuristics).
 */
export function resolveSameTeamTrainingCancellationOffer(
  focalItem: WeekplannerItem,
  conflict: WeekplannerConflict,
  itemsById: Map<string, WeekplannerItem>,
): SameTeamTrainingCancellationOffer | null {
  const partnerId = conflict.partnerItemId?.trim();
  if (!partnerId) return null;
  const partner = itemsById.get(partnerId);
  if (!partner) return null;

  const pair = pairTrainingAndMatch(focalItem, partner);
  if (!pair) return null;
  if (!activityEffectiveTimesOverlap(pair.training, pair.match)) return null;
  if (!sameCanonicalTeamSeasonId(pair.training, pair.match)) return null;
  return pair;
}

export function canOfferSameTeamTrainingCancellation(
  offer: SameTeamTrainingCancellationOffer,
  actor: ManipulationActorPermissions,
): boolean {
  return actor.canManageTrainings && !!offer.training.trainingSessionId?.trim();
}
