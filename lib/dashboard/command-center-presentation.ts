/**
 * SCE-DASHBOARD-V3-02B — Pure presentation builders for the command center.
 *
 * Serializable, testable transforms for match/tournament logos, news hero
 * images, and enriched schedule metadata. No database access here.
 */

import { resolveMatchParticipantIdentity } from "@/lib/sporting-data/match-participant-identity";
import type { CanonicalEventPolicyRow } from "@/lib/publishing/infoboard/canonical-source-loader";
import {
  resolveInfoboardTeamSubDisplayName,
} from "@/lib/publishing/presentation/infoboard-match-presentation";
import type { ParticipantDressingRoomInput } from "@/lib/dashboard/event-venue-presentation";
import { resolveTournamentParticipantLogoUrl } from "@/lib/tournaments/club-identity";
import type { TournamentLogoResolutionContext } from "@/lib/tournaments/logo-resolution-context";

// ── Serializable presentation types ───────────────────────────────────────────

export type CommandCenterClubSide = {
  displayName: string;
  logoUrl: string | null;
  /** Primary club line when canonical split is available. */
  clubLine?: string;
  /** Secondary team line when canonical split is available. */
  teamLine?: string;
};

export type CommandCenterMatchPresentation = {
  competitionLabel?: string;
  home: CommandCenterClubSide;
  away: CommandCenterClubSide;
};

export type CommandCenterTournamentParticipant = {
  displayName: string;
  logoUrl: string | null;
};

export type CommandCenterNewsItem = {
  key: string;
  id: string;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  publishedAtLabel: string;
  href: string;
};

export type CommandCenterUpcomingLogo = {
  logoUrl: string | null;
  displayName: string;
};

// ── News hero resolution ──────────────────────────────────────────────────────

export function resolveNewsHeroImageUrl(input: {
  heroMediaUrl?: string | null;
  imageUrl?: string | null;
}): string | null {
  const heroMediaUrl = input.heroMediaUrl?.trim();
  if (heroMediaUrl) return heroMediaUrl;

  const imageUrl = input.imageUrl?.trim();
  return imageUrl || null;
}

// ── Match identity ────────────────────────────────────────────────────────────

type PolicyTeamRow = NonNullable<CanonicalEventPolicyRow["team"]>;

function resolveOwnTeamDisplayLines(
  team: PolicyTeamRow | null | undefined,
  tenantClubName: string,
): { clubLine?: string; teamLine?: string } {
  if (!team) return {};

  const teamLine = resolveInfoboardTeamSubDisplayName({
    clubDisplayName: tenantClubName,
    teamName: team.name,
    teamShortName: team.shortName,
    teamAlternativeName: team.alternativeName,
    teamInfoboardDisplayName: team.infoboardDisplayName,
    teamInfoboardMatchDisplayName: team.infoboardMatchDisplayName,
  });

  if (!teamLine) return {};
  return { clubLine: tenantClubName, teamLine };
}

function resolveExternalTeamDisplayLines(
  clubName: string | null | undefined,
  team: {
    name: string;
    shortName: string | null;
    alternativeName: string | null;
  } | null | undefined,
): { clubLine?: string; teamLine?: string } {
  const clubLine = clubName?.trim();
  if (!clubLine) return {};

  const teamLine = team
    ? resolveInfoboardTeamSubDisplayName({
        clubDisplayName: clubLine,
        teamName: team.name,
        teamShortName: team.shortName,
        teamAlternativeName: team.alternativeName,
      })
    : null;

  if (!teamLine) return { clubLine };
  return { clubLine, teamLine };
}

function applyDashboardMatchSideLines(
  side: CommandCenterClubSide,
  lines: { clubLine?: string; teamLine?: string },
): CommandCenterClubSide {
  if (!lines.clubLine && !lines.teamLine) return side;
  return { ...side, ...lines };
}

function resolveDashboardMatchSideLines(
  sideKey: "home" | "away",
  policy: CanonicalEventPolicyRow | undefined,
  tenantClubName: string,
): { clubLine?: string; teamLine?: string } {
  if (!policy) return {};

  const homeAway = (policy.homeAway ?? "HOME").trim().toUpperCase();
  const ownTeamIsAway = homeAway === "AWAY";
  const isOwnSide =
    (sideKey === "home" && !ownTeamIsAway) || (sideKey === "away" && ownTeamIsAway);
  const mapping = policy.matchExternalMapping;

  if (mapping) {
    if (sideKey === "home") {
      if (mapping.homeTeam) {
        return isOwnSide
          ? resolveOwnTeamDisplayLines(mapping.homeTeam, tenantClubName)
          : resolveExternalTeamDisplayLines(tenantClubName, mapping.homeTeam);
      }
      if (mapping.homeExternalTeam) {
        return resolveExternalTeamDisplayLines(
          mapping.homeExternalTeam.externalClub.name,
          mapping.homeExternalTeam,
        );
      }
      return {};
    }

    if (mapping.awayTeam) {
      return isOwnSide
        ? resolveOwnTeamDisplayLines(mapping.awayTeam, tenantClubName)
        : resolveExternalTeamDisplayLines(tenantClubName, mapping.awayTeam);
    }
    if (mapping.awayExternalTeam) {
      return resolveExternalTeamDisplayLines(
        mapping.awayExternalTeam.externalClub.name,
        mapping.awayExternalTeam,
      );
    }
    return {};
  }

  if (isOwnSide) {
    return resolveOwnTeamDisplayLines(policy.team, tenantClubName);
  }

  if (sideKey === "away" && policy.opponentExternalClub) {
    return { clubLine: policy.opponentExternalClub.name.trim() };
  }

  return {};
}

export function buildCommandCenterMatchPresentation(input: {
  policy: CanonicalEventPolicyRow | undefined;
  opponentName: string | null;
  ownTeamDisplayName: string | null;
  tenantClubName: string;
  tenantLogoUrl: string | null;
  canonicalLogoByProviderClubId: ReadonlyMap<number, string | null>;
}): CommandCenterMatchPresentation | null {
  const identity = resolveMatchParticipantIdentity(
    input.policy,
    {
      opponentName: input.opponentName,
      ownTeamDisplayName: input.ownTeamDisplayName,
    },
    input.tenantClubName,
    input.tenantLogoUrl,
    input.canonicalLogoByProviderClubId,
  );

  const homeName = identity.home.displayName?.trim();
  const awayName = identity.away.displayName?.trim();

  if (!homeName && !awayName) return null;

  const homeLines = resolveDashboardMatchSideLines(
    "home",
    input.policy,
    input.tenantClubName,
  );
  const awayLines = resolveDashboardMatchSideLines(
    "away",
    input.policy,
    input.tenantClubName,
  );

  return {
    competitionLabel: input.policy?.competitionLabel?.trim() || undefined,
    home: applyDashboardMatchSideLines(
      {
        displayName: homeName || "Heim",
        logoUrl: identity.home.logoUrl,
      },
      homeLines,
    ),
    away: applyDashboardMatchSideLines(
      {
        displayName: awayName || "Gast",
        logoUrl: identity.away.logoUrl,
      },
      awayLines,
    ),
  };
}

// ── Tournament participants ───────────────────────────────────────────────────

type TournamentParticipantRow = Parameters<typeof resolveTournamentParticipantLogoUrl>[0] & {
  displayName: string | null;
  manualLabel: string | null;
  displayOrder: number;
  dressingRoomAllocations?: Array<{
    facilityResource: {
      code: string;
      name: string;
    };
  }>;
  team: {
    name: string;
    shortName: string | null;
    alternativeName: string | null;
    infoboardTournamentDisplayName?: string | null;
    infoboardDisplayName?: string | null;
  } | null;
  externalClub: { name: string } | null;
  externalTeam: { name: string } | null;
};

function resolveParticipantDisplayName(row: TournamentParticipantRow): string {
  const configured = row.displayName?.trim();
  if (configured) return configured;
  if (row.team) {
    return (
      row.team.infoboardTournamentDisplayName?.trim() ||
      row.team.infoboardDisplayName?.trim() ||
      row.team.shortName?.trim() ||
      row.team.name
    );
  }
  if (row.externalClub) return row.externalClub.name;
  if (row.externalTeam) return row.externalTeam.name;
  return row.manualLabel?.trim() || "";
}

export function buildCommandCenterTournamentParticipants(
  rows: readonly TournamentParticipantRow[],
  tenantLogoUrl: string | null,
  logoContext: TournamentLogoResolutionContext,
): CommandCenterTournamentParticipant[] {
  return [...rows]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((row) => ({
      displayName: resolveParticipantDisplayName(row),
      logoUrl: resolveTournamentParticipantLogoUrl(row, tenantLogoUrl, logoContext),
    }))
    .filter((participant) => participant.displayName.length > 0);
}

export function buildCommandCenterParticipantDressingRoomAllocations(
  rows: readonly TournamentParticipantRow[],
): ParticipantDressingRoomInput[] {
  return [...rows]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((row) => ({
      participantLabel: resolveParticipantDisplayName(row),
      rooms:
        row.dressingRoomAllocations?.map((allocation) => ({
          code: allocation.facilityResource.code,
          label: allocation.facilityResource.name,
        })) ?? [],
    }))
    .filter(
      (entry) => entry.participantLabel.length > 0 && entry.rooms.length > 0,
    );
}
