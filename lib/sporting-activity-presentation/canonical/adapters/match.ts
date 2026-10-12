import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design";
import { getMatchcenterResultLabel } from "@/lib/matchcenter/match-lifecycle";
import { resolveSpieleStatusPresentation } from "@/lib/matchcenter/management-view";
import {
  assessMatchOperationalState,
  type MatchcenterOperationalAssessment,
} from "@/lib/matchcenter/operational-state";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import {
  buildSportingActivityLocation,
  normalizeSportingLocationMode,
} from "@/lib/sporting-activity-presentation/location";
import { buildSpieleManagementActivityPresentation } from "@/lib/sporting-activity-presentation/management-match-presentation";
import { buildSceActivityRoute } from "../route";
import {
  buildSceActivityPresentationStatus,
  mapSpieleStatusLabelToSemantic,
} from "../status";
import type { SceMatchPresentationModel } from "../types";

export type ResolveSceMatchPresentationInput = {
  match: MatchcenterMatchSummary;
  tenantLogoUrl?: string | null;
  tenantClubName?: string | null;
  assessment?: MatchcenterOperationalAssessment;
  pitchLabel?: string | null;
};

export function resolveSceMatchPresentation(
  input: ResolveSceMatchPresentationInput,
): SceMatchPresentationModel {
  const { match } = input;
  const resourceKey = `event:${match.id}`;
  const legacyPresentation = buildSpieleManagementActivityPresentation(match, {
    tenantClubName: input.tenantClubName,
    pitchLabel: input.pitchLabel,
  });

  const clubPair = buildMatchClubIdentityPair(match, input.tenantLogoUrl);
  const assessment = input.assessment ?? assessMatchOperationalState(match);
  const spieleStatus = resolveSpieleStatusPresentation(match, assessment);

  const canonicalResultLabel = getMatchcenterResultLabel(match);
  const rawResultLabel = match.resultLabel?.trim() || null;
  const displayLabel = canonicalResultLabel ?? rawResultLabel;
  const result =
    displayLabel || match.scoreHome != null || match.scoreAway != null
      ? {
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          displayLabel,
        }
      : null;

  const mode = normalizeSportingLocationMode(match.homeAway);
  const pitch =
    input.pitchLabel?.trim() || match.operational.pitchCode?.trim() || undefined;

  const location =
    legacyPresentation.location ??
    buildSportingActivityLocation({
      mode,
      hostOrOrganiser: undefined,
      venueName: match.location,
      facilityResource: pitch,
    });

  return {
    kind: "MATCH",
    activityId: match.id,
    resourceKey,
    typeLabel: legacyPresentation.identity.typeLabel,
    schedule: legacyPresentation.schedule,
    location,
    route: buildSceActivityRoute("MATCH", resourceKey),
    status: legacyPresentation.status
      ? buildSceActivityPresentationStatus({ domain: legacyPresentation.status })
      : undefined,
    fixture: {
      home: clubPair.homeClubIdentity,
      away: clubPair.awayClubIdentity,
      homeLeftAwayRightInvariant: true,
    },
    competition: match.competitionLabel?.trim()
      ? { label: match.competitionLabel.trim() }
      : undefined,
    teamContext: legacyPresentation.team?.name
      ? { name: legacyPresentation.team.name }
      : undefined,
    result,
    matchLifecycle: buildSceActivityPresentationStatus({
      domain: match.status,
      label: spieleStatus.label,
      semantic: mapSpieleStatusLabelToSemantic(spieleStatus.label),
    }),
  };
}
