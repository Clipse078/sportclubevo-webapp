import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";

export function participantIdentityFromPlanung(side: TournamentPlanungFixtureSidePresentation) {
  return buildClubIdentity({
    id: side.participantId ?? undefined,
    displayName: side.label,
    logoUrl: side.crestUrl,
    preferNeutralIcon: side.isPlaceholder,
  });
}
