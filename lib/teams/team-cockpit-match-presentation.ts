/**
 * Thin bridge: Team Cockpit season match rows → canonical 01C Match presentation.
 * No parallel home/away or crest logic — delegates to resolveSceMatchPresentation.
 */

import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import { buildSceMatchResultPerspectiveContextBadge } from "@/lib/sporting-activity-presentation/canonical/match-context-badges";
import type { SceMatchPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";
import type { TeamCockpitResultPerspective } from "@/lib/teams/team-cockpit-sporting-data";
import type {
  TeamMatchSideIdentity,
  TeamSeasonMatchCompetitionContext,
  TeamSeasonMatchItem,
} from "@/lib/teams/team-match-query-service";

function meaningful(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveTeamSeasonMatchCompetitionLabel(
  competition: TeamSeasonMatchCompetitionContext,
): string | null {
  return (
    meaningful(competition.eventCompetitionLabel) ??
    meaningful(competition.canonicalCompetitionName) ??
    meaningful(competition.canonicalCompetitionShortName) ??
    meaningful(competition.providerLeagueName) ??
    meaningful(competition.providerDivisionName)
  );
}

const EMPTY_MATCHCENTER_SOURCE: MatchcenterMatchSummary["source"] = {
  eventSource: "INTERNAL",
  externalSource: null,
  externalSourceId: null,
  provider: null,
  externalMatchId: null,
  externalSeasonId: null,
  matchNumber: null,
};

const EMPTY_SYNCHRONIZATION: MatchcenterMatchSummary["synchronization"] = {
  eventLastSyncedAt: null,
  mappingLastSyncedAt: null,
  detailSyncedAt: null,
  providerMatchState: null,
  providerMatchStateName: null,
};

const EMPTY_OPERATIONAL: MatchcenterMatchSummary["operational"] = {
  pitchCode: null,
  homeDressingRoomCode: null,
  awayDressingRoomCode: null,
  meetingTime: null,
  remarks: null,
};

const EMPTY_VISIBILITY: MatchcenterMatchSummary["visibility"] = {
  websiteVisible: true,
  infoboardVisible: false,
  homepageVisible: false,
  wochenplanVisible: false,
  trainingsplanVisible: false,
  teamPageVisible: true,
};

function toMatchcenterSide(
  identity: TeamMatchSideIdentity,
  ownTeamId: string,
  ownTeamShortName: string | null | undefined,
): MatchcenterSide {
  const isOwnTeam = identity.canonicalTeamId === ownTeamId;

  return {
    providerTeamId: identity.providerTeamId,
    providerTeamName: identity.providerTeamName,
    canonicalTeamId: identity.canonicalTeamId,
    canonicalTeamName: isOwnTeam ? identity.displayName : null,
    canonicalTeamShortName: isOwnTeam ? ownTeamShortName ?? null : null,
    canonicalTeamAlternativeName: null,
    displayName: identity.displayName,
    resolution:
      identity.canonicalTeamId || identity.canonicalExternalTeamId
        ? "RESOLVED"
        : "UNRESOLVED",
    isOwnTeam,
    canonicalExternalTeamId: identity.canonicalExternalTeamId,
    canonicalExternalClubId: null,
    canonicalExternalTeamName: identity.clubName,
    canonicalExternalTeamShortName: null,
    canonicalExternalTeamAlternativeName: null,
    externalLogoUrl: identity.externalLogoUrl,
  };
}

export function teamSeasonMatchItemToMatchcenterSummary(
  item: TeamSeasonMatchItem,
  input: {
    teamId: string;
    teamShortName?: string | null;
  },
): MatchcenterMatchSummary {
  const endAt = item.endAt ?? item.startAt;
  const competitionLabel = resolveTeamSeasonMatchCompetitionLabel(item.competition);

  return {
    id: item.eventId,
    tenantId: item.tenantId,
    teamId: input.teamId,
    teamSeasonId: item.teamSeasonId,
    seasonId: item.seasonId,
    type: "MATCH",
    title: `${item.home.displayName} – ${item.away.displayName}`,
    description: null,
    status: item.status,
    startAt: item.startAt,
    kickoffKnown: true,
    endAt: item.endAt,
    operationalEndAtOverride: null,
    operationalEndAt: endAt,
    location: item.location ?? item.venueName,
    competitionLabel,
    homeAway: item.side,
    resultLabel: item.resultLabel,
    intermediateResultLabel: item.intermediateResultLabel,
    scoreHome: item.scoreHome,
    scoreAway: item.scoreAway,
    home: toMatchcenterSide(item.home, input.teamId, input.teamShortName),
    away: toMatchcenterSide(item.away, input.teamId, input.teamShortName),
    source: {
      ...EMPTY_MATCHCENTER_SOURCE,
      provider: item.provider.provider,
      externalMatchId: item.provider.externalMatchId,
      externalSeasonId: item.provider.externalSeasonId,
      matchNumber: item.provider.matchNumber,
    },
    synchronization: {
      ...EMPTY_SYNCHRONIZATION,
      providerMatchState: item.provider.providerMatchState,
      providerMatchStateName: item.provider.providerMatchStateName,
    },
    operational: EMPTY_OPERATIONAL,
    visibility: EMPTY_VISIBILITY,
    reviewStage: "APPROVED",
    publishedAt: null,
    participationResponseDueAt: null,
    participationReminder1At: null,
    participationReminder2At: null,
    participationReminder1PresetKey: null,
    participationReminder2PresetKey: null,
  };
}

export type ResolveTeamCockpitMatchPresentationInput = {
  item: TeamSeasonMatchItem;
  teamId: string;
  teamShortName?: string | null;
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
  now?: Date;
  timezone?: string;
  resultPerspective?: TeamCockpitResultPerspective;
};

export function resolveTeamCockpitMatchPresentation(
  input: ResolveTeamCockpitMatchPresentationInput,
): SceMatchPresentationModel {
  const match = teamSeasonMatchItemToMatchcenterSummary(input.item, {
    teamId: input.teamId,
    teamShortName: input.teamShortName,
  });

  const model = resolveSceMatchPresentation({
    match,
    tenantClubName: input.tenantClubName,
    tenantLogoUrl: input.tenantLogoUrl,
    now: input.now,
    timezone: input.timezone,
  });

  const perspectiveBadge = input.resultPerspective
    ? buildSceMatchResultPerspectiveContextBadge(input.resultPerspective)
    : null;

  if (!perspectiveBadge) {
    return model;
  }

  const contextBadges = [...(model.contextBadges ?? []), perspectiveBadge];
  return { ...model, contextBadges };
}
