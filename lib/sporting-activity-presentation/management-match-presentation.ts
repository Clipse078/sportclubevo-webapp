import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { resolveMatchcenterCompactSideName } from "@/lib/matchcenter/team-display";
import {
  buildSportingActivityLocation,
  normalizeSportingLocationMode,
} from "./location";
import type { SportingActivityPresentation } from "./types";

function resolveOpponentSideLabel(match: MatchcenterMatchSummary): string | null {
  const opponentSide = match.home.isOwnTeam
    ? match.away
    : match.away.isOwnTeam
      ? match.home
      : match.away;
  return resolveMatchcenterCompactSideName(opponentSide)?.trim() || opponentSide.displayName?.trim() || null;
}

function resolveOwnTeamSideLabel(match: MatchcenterMatchSummary): string | null {
  if (match.home.isOwnTeam) {
    return resolveMatchcenterCompactSideName(match.home);
  }
  if (match.away.isOwnTeam) {
    return resolveMatchcenterCompactSideName(match.away);
  }
  return null;
}

function resolveSpieleTenantClubName(
  match: MatchcenterMatchSummary,
  tenantClubName?: string | null,
): string {
  const fromTenant = tenantClubName?.trim();
  if (fromTenant) return fromTenant;
  if (match.home.isOwnTeam) {
    return resolveMatchcenterCompactSideName(match.home) ?? match.home.displayName?.trim() ?? "";
  }
  if (match.away.isOwnTeam) {
    return resolveMatchcenterCompactSideName(match.away) ?? match.away.displayName?.trim() ?? "";
  }
  return "";
}

/** Client-safe Spiele management identity (no server-only builder dependencies). */
export function buildSpieleManagementActivityPresentation(
  match: MatchcenterMatchSummary,
  options: { tenantClubName?: string | null; pitchLabel?: string | null } = {},
): SportingActivityPresentation {
  const homeName = resolveMatchcenterCompactSideName(match.home);
  const awayName = resolveMatchcenterCompactSideName(match.away);
  const mode = normalizeSportingLocationMode(match.homeAway);
  const pitch =
    options.pitchLabel?.trim() || match.operational.pitchCode?.trim() || undefined;

  const hostOrOrganiser =
    mode === "HOME"
      ? resolveSpieleTenantClubName(match, options.tenantClubName) || undefined
      : mode === "AWAY"
        ? homeName || undefined
        : undefined;

  const fixtureLine =
    homeName && awayName ? `${homeName} – ${awayName}` : match.title.trim();

  return {
    identity: {
      resourceKey: `event:${match.id}`,
      title: match.title,
      typeLabel: "Spiel",
      activityKind: "MATCH",
    },
    schedule: {
      startAt: match.startAt.toISOString(),
      endAt: match.endAt ? match.endAt.toISOString() : null,
    },
    participants: {
      fixtureLine,
      opponentName: resolveOpponentSideLabel(match) ?? undefined,
      homeAway: mode,
    },
    context: match.competitionLabel?.trim()
      ? { competitionLabel: match.competitionLabel.trim() }
      : undefined,
    location: buildSportingActivityLocation({
      mode,
      hostOrOrganiser,
      venueName: match.location,
      facilityResource: pitch,
    }),
  };
}
