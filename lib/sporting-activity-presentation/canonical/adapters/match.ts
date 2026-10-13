import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design";
import { getMatchcenterResultLabel } from "@/lib/matchcenter/match-lifecycle";
import {
  assessMatchOperationalState,
  type MatchcenterOperationalAssessment,
} from "@/lib/matchcenter/operational-state";
import { buildSceMatchTenantSideContextBadge } from "../match-context-badges";
import { resolveSceMatchLifecycleStatus } from "../match-lifecycle-status";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { buildMatchSportingActivityLocation } from "@/lib/sporting-activity-presentation/match-location";
import { resolveMatchcenterCompactSideName } from "@/lib/matchcenter/team-display";
import { buildSpieleManagementActivityPresentation } from "@/lib/sporting-activity-presentation/management-match-presentation";
import { buildSceActivityRoute } from "../route";
import { buildSceActivityPresentationStatus } from "../status";
import type { SceMatchPresentationModel } from "../types";

export type ResolveSceMatchPresentationInput = {
  match: MatchcenterMatchSummary;
  tenantLogoUrl?: string | null;
  tenantClubName?: string | null;
  assessment?: MatchcenterOperationalAssessment;
  pitchLabel?: string | null;
  now?: Date;
  timezone?: string;
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

  const displayLabel = getMatchcenterResultLabel(match, input.now);
  const result = displayLabel
    ? {
        scoreHome: match.scoreHome,
        scoreAway: match.scoreAway,
        displayLabel,
      }
    : null;

  const homeDisplayName =
    resolveMatchcenterCompactSideName(match.home)?.trim() ||
    match.home.displayName?.trim() ||
    "";

  const location = buildMatchSportingActivityLocation({
    homeAway: match.homeAway,
    tenantClubName: input.tenantClubName,
    homeSideDisplayName: homeDisplayName,
    venueName: match.location,
    operationalPitchCode: match.operational.pitchCode,
    resolvedPitchLabel: input.pitchLabel,
  });

  const normalizedSide = match.homeAway?.trim().toUpperCase();
  const tenantSide = buildSceMatchTenantSideContextBadge(
    normalizedSide === "HOME" || normalizedSide === "AWAY" ? normalizedSide : null,
  );
  const contextBadges = tenantSide ? [tenantSide] : undefined;

  return {
    kind: "MATCH",
    activityId: match.id,
    resourceKey,
    typeLabel: "SPIEL",
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
    matchLifecycle: resolveSceMatchLifecycleStatus({
      match,
      now: input.now,
      timezone: input.timezone,
    }),
    contextBadges,
  };
}
