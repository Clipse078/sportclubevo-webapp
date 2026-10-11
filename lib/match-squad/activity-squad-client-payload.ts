/**
 * Client-side merge for activity squad API payloads after mutations.
 */

import type { MatchAvailabilityCollectionMetaView, MatchSquadViewModel } from "@/lib/match-squad/types";

export type ActivitySquadClientPayload = MatchSquadViewModel & {
  canEdit?: boolean;
  canManageAvailability?: boolean;
  canManageRelease?: boolean;
  releaseReadOnly?: boolean;
  availabilityCollection?: MatchAvailabilityCollectionMetaView;
};

export function mergeActivitySquadClientPayload(
  previous: ActivitySquadClientPayload | null,
  next: ActivitySquadClientPayload,
): ActivitySquadClientPayload {
  if (!previous) return next;
  return {
    ...next,
    availabilityCollection: next.availabilityCollection ?? previous.availabilityCollection,
    canManageAvailability: next.canManageAvailability ?? previous.canManageAvailability,
    canManageRelease: next.canManageRelease ?? previous.canManageRelease,
    releaseReadOnly: next.releaseReadOnly ?? previous.releaseReadOnly,
  };
}
