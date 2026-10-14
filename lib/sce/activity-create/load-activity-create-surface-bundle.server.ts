import type { ClubEventComposerCreateSurfaceProps } from "@/lib/club-events/composer/load-club-event-composer-create-surface-props.server";
import { loadClubEventComposerCreateSurfaceProps } from "@/lib/club-events/composer/load-club-event-composer-create-surface-props.server";
import type { MatchComposerCreateSurfaceProps } from "@/lib/matchcenter/composer/load-match-composer-create-surface-props.server";
import { loadMatchComposerCreateSurfaceProps } from "@/lib/matchcenter/composer/load-match-composer-create-surface-props.server";
import type { TrainingComposerCreateSurfaceProps } from "@/lib/training/composer/load-training-composer-create-surface-props.server";
import { loadTrainingComposerCreateSurfaceProps } from "@/lib/training/composer/load-training-composer-create-surface-props.server";
import type { TournamentComposerCreateSurfaceProps } from "@/lib/tournaments/composer/load-tournament-composer-create-surface-props.server";
import { loadTournamentComposerCreateSurfaceProps } from "@/lib/tournaments/composer/load-tournament-composer-create-surface-props.server";
import type { SceActivityCreatePermissions } from "./activity-create-permissions";

export type SceActivityCreateSurfaceBundle = {
  trainingComposer: TrainingComposerCreateSurfaceProps | null;
  matchComposer: MatchComposerCreateSurfaceProps | null;
  tournamentComposer: TournamentComposerCreateSurfaceProps | null;
  clubEventComposer: ClubEventComposerCreateSurfaceProps | null;
};

type LoadBundleArgs = {
  tenantId: string;
  userId: string;
  timeZone: string;
  tenantClubName: string;
  tenantLogoUrl: string | null;
  permissions: SceActivityCreatePermissions;
};

/** Load composer surface props only for activity types the user may create. */
export async function loadSceActivityCreateSurfaceBundle({
  tenantId,
  userId,
  timeZone,
  tenantClubName,
  tenantLogoUrl,
  permissions,
}: LoadBundleArgs): Promise<SceActivityCreateSurfaceBundle> {
  const [trainingComposer, matchComposer, tournamentComposer, clubEventComposer] = await Promise.all([
    permissions.training
      ? loadTrainingComposerCreateSurfaceProps({ tenantId, userId, timeZone })
      : Promise.resolve(null),
    permissions.match
      ? loadMatchComposerCreateSurfaceProps({
          tenantId,
          userId,
          tenantClubName,
          tenantLogoUrl,
        })
      : Promise.resolve(null),
    permissions.tournament
      ? loadTournamentComposerCreateSurfaceProps({
          tenantId,
          userId,
          tenantClubName,
          tenantLogoUrl,
        })
      : Promise.resolve(null),
    permissions.veranstaltung
      ? loadClubEventComposerCreateSurfaceProps({ tenantId, timeZone })
      : Promise.resolve(null),
  ]);

  return {
    trainingComposer,
    matchComposer,
    tournamentComposer,
    clubEventComposer,
  };
}
