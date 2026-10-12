import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design";
import { buildTournamentOrganiserClubIdentity } from "@/lib/sporting-activity-design/tournament-organiser-identity";
import {
  buildSceActivityRoute,
  parseActivityIdFromResourceKey,
  resolveSceTrainingPresentationFromLegacy,
  buildSceActivityPresentationStatus,
  type SceActivityPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical";
import type { SportingActivityDetail } from "./types";

/**
 * Architecture integration path: Activity Detail → canonical 01C presentation model.
 * Does not mutate the underlying detail snapshot.
 */
export function resolveSceActivityPresentationFromDetail(
  detail: SportingActivityDetail,
  options: { tenantLogoUrl?: string | null } = {},
): SceActivityPresentationModel {
  const { presentation } = detail;
  const activityId = parseActivityIdFromResourceKey(detail.resourceKey);

  switch (detail.kind) {
    case "TRAINING":
      return resolveSceTrainingPresentationFromLegacy(presentation);
    case "MATCH": {
      if (!detail.match) {
        throw new Error("resolveSceActivityPresentationFromDetail: match section required");
      }
      const clubPair = detail.match.clubPair;
      return {
        kind: "MATCH",
        activityId,
        resourceKey: detail.resourceKey,
        typeLabel: presentation.identity.typeLabel,
        schedule: { ...presentation.schedule },
        location: { ...presentation.location },
        route: buildSceActivityRoute("MATCH", detail.resourceKey),
        status: presentation.status
          ? buildSceActivityPresentationStatus({ domain: presentation.status })
          : undefined,
        fixture: {
          home: clubPair.homeClubIdentity,
          away: clubPair.awayClubIdentity,
          homeLeftAwayRightInvariant: true,
        },
        competition: presentation.context?.competitionLabel
          ? { label: presentation.context.competitionLabel }
          : undefined,
        teamContext: presentation.team?.name ? { name: presentation.team.name } : undefined,
        result: null,
        matchLifecycle: presentation.status
          ? buildSceActivityPresentationStatus({ domain: presentation.status })
          : undefined,
      };
    }
    case "TOURNAMENT": {
      if (!detail.tournament) {
        throw new Error("resolveSceActivityPresentationFromDetail: tournament section required");
      }
      const organiser = detail.tournament.organiserClubIdentity;
      return {
        kind: "TOURNAMENT",
        activityId,
        resourceKey: detail.resourceKey,
        typeLabel: presentation.identity.typeLabel,
        tournamentTitle: presentation.identity.title,
        organiser,
        hauptteam: presentation.team?.name ? { name: presentation.team.name } : undefined,
        schedule: { ...presentation.schedule },
        location: { ...presentation.location },
        route: buildSceActivityRoute("TOURNAMENT", detail.resourceKey),
        status: presentation.status
          ? buildSceActivityPresentationStatus({ domain: presentation.status })
          : undefined,
      };
    }
    default: {
      const _exhaustive: never = detail.kind;
      throw new Error(`Unsupported detail kind: ${_exhaustive}`);
    }
  }
}

/** Ensures detail-loaded match club pairs stay fixture-authoritative (guardrail helper). */
export function auditDetailMatchClubPair(
  detail: SportingActivityDetail,
  matchSummary: Parameters<typeof buildMatchClubIdentityPair>[0],
  tenantLogoUrl?: string | null,
): boolean {
  if (!detail.match) return false;
  const expected = buildMatchClubIdentityPair(matchSummary, tenantLogoUrl);
  return (
    detail.match.clubPair.homeClubIdentity.displayName ===
      expected.homeClubIdentity.displayName &&
    detail.match.clubPair.awayClubIdentity.displayName ===
      expected.awayClubIdentity.displayName
  );
}

export function resolveTournamentOrganiserFromDetail(
  detail: SportingActivityDetail,
): ReturnType<typeof buildTournamentOrganiserClubIdentity> | null {
  return detail.tournament?.organiserClubIdentity ?? null;
}
