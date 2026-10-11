/**
 * Canonical API extensions for Match/Tournament activity squad routes.
 * Keeps GET and PUT (and conflict payloads) aligned for release-action eligibility.
 */

import type { MatchAvailabilityCollectionMetaView, MatchSquadViewModel } from "@/lib/match-squad/types";
import { resolvePlayerReleaseAccess } from "@/lib/match-squad/player-release-auth";

export type { ActivitySquadClientPayload as ActivitySquadApiPayload } from "@/lib/match-squad/activity-squad-client-payload";
export { mergeActivitySquadClientPayload } from "@/lib/match-squad/activity-squad-client-payload";

type ActivitySquadApiPayload = MatchSquadViewModel & {
  canEdit: boolean;
  canManageAvailability: boolean;
  canManageRelease: boolean;
  releaseReadOnly: boolean;
  availabilityCollection?: MatchAvailabilityCollectionMetaView;
};

export async function resolveActivitySquadApiExtensions(input: {
  squad: MatchSquadViewModel;
  userId: string;
  tenant: { id: string; key: string };
  accessCanEdit: boolean;
}): Promise<Pick<
  ActivitySquadApiPayload,
  "canEdit" | "canManageAvailability" | "canManageRelease" | "releaseReadOnly"
>> {
  const releaseAccess = input.squad.teamId
    ? await resolvePlayerReleaseAccess({
        userId: input.userId,
        tenantId: input.tenant.id,
        tenantKey: input.tenant.key,
        teamId: input.squad.teamId,
        teamSeasonId: input.squad.teamSeasonId,
      })
    : null;

  const canEdit = input.accessCanEdit && input.squad.editable;

  return {
    canEdit,
    canManageAvailability: input.accessCanEdit,
    canManageRelease: Boolean(releaseAccess?.canManageSource) && input.squad.editable,
    releaseReadOnly: !input.squad.editable,
  };
}

export async function buildActivitySquadApiPayload(input: {
  squad: MatchSquadViewModel;
  userId: string;
  tenant: { id: string; key: string };
  accessCanEdit: boolean;
  availabilityCollection?: MatchAvailabilityCollectionMetaView | null;
}): Promise<ActivitySquadApiPayload> {
  const extensions = await resolveActivitySquadApiExtensions(input);
  return {
    ...input.squad,
    ...extensions,
    availabilityCollection: input.availabilityCollection ?? undefined,
  };
}
