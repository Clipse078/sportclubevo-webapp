/**
 * SCE-COLLAB-01B — assemble match change impact after successful mutations.
 */

import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildMatchActivityChangeImpact } from "@/lib/collaboration/match/match-activity-change";
import type { MatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";
import { resolveMatchAudienceContext } from "@/lib/collaboration/match/resolve-match-audience";
import { buildOperationalAudienceForTeamIds } from "@/lib/collaboration/shared/operational-audience";
import { resolveActivityAudiencePreview } from "@/lib/collaboration/shared/resolve-activity-audience-preview";

export async function resolveMatchCollaborationImpactAfterChange(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  before: MatchActivitySnapshot;
  after: MatchActivitySnapshot;
}): Promise<ActivityChangeImpact | null> {
  const audienceContext = await resolveMatchAudienceContext({
    tenantId: input.tenantId,
    snapshot: input.after,
  });
  if (!audienceContext) {
    const impact = buildMatchActivityChangeImpact({
      before: input.before,
      after: input.after,
      canCommunicate: false,
      audience: null,
    });
    return impact.worthy ? impact : null;
  }

  const audienceSpec = buildOperationalAudienceForTeamIds(audienceContext.teamIds);
  const { canCommunicate, audience } = await resolveActivityAudiencePreview({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    primaryTeamId: audienceContext.primaryTeamId,
    teamIds: audienceContext.teamIds,
    teamName: audienceContext.teamName,
    teamNamesLabel: audienceContext.teamNamesLabel,
    eventId: input.after.matchId,
    audience: audienceSpec,
  });

  const impact = buildMatchActivityChangeImpact({
    before: input.before,
    after: input.after,
    canCommunicate,
    audience,
  });

  return impact.worthy ? impact : null;
}
