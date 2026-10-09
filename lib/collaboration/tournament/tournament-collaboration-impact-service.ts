import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildTournamentActivityChangeImpact } from "@/lib/collaboration/tournament/tournament-activity-change";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import { resolveTournamentAudienceContext } from "@/lib/collaboration/tournament/resolve-tournament-audience";
import { buildOperationalAudienceForTeamIds } from "@/lib/collaboration/shared/operational-audience";
import { resolveActivityAudiencePreview } from "@/lib/collaboration/shared/resolve-activity-audience-preview";

export async function resolveTournamentCollaborationImpactAfterChange(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  before: TournamentActivitySnapshot;
  after: TournamentActivitySnapshot;
}): Promise<ActivityChangeImpact | null> {
  const audienceContext = await resolveTournamentAudienceContext({
    tenantId: input.tenantId,
    tournamentId: input.after.tournamentId,
    eventTeamId: input.after.teamId,
  });

  if (!audienceContext) {
    const impact = buildTournamentActivityChangeImpact({
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
    eventId: input.after.tournamentId,
    audience: audienceSpec,
  });

  const impact = buildTournamentActivityChangeImpact({
    before: input.before,
    after: input.after,
    canCommunicate,
    audience,
  });

  return impact.worthy ? impact : null;
}
