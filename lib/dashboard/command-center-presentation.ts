/**
 * SCE-DASHBOARD-V3-02B — Pure presentation builders for the command center.
 *
 * Serializable, testable transforms for match/tournament logos, news hero
 * images, and enriched schedule metadata. No database access here.
 */

import { resolveMatchParticipantIdentity } from "@/lib/sporting-data/match-participant-identity";
import type { CanonicalEventPolicyRow } from "@/lib/publishing/infoboard/canonical-source-loader";
import { resolveTournamentParticipantLogoUrl } from "@/lib/tournaments/club-identity";
import type { TournamentLogoResolutionContext } from "@/lib/tournaments/logo-resolution-context";

// ── Serializable presentation types ───────────────────────────────────────────

export type CommandCenterClubSide = {
  displayName: string;
  logoUrl: string | null;
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

  return {
    competitionLabel: input.policy?.competitionLabel?.trim() || undefined,
    home: {
      displayName: homeName || "Heim",
      logoUrl: identity.home.logoUrl,
    },
    away: {
      displayName: awayName || "Gast",
      logoUrl: identity.away.logoUrl,
    },
  };
}

// ── Tournament participants ───────────────────────────────────────────────────

type TournamentParticipantRow = Parameters<typeof resolveTournamentParticipantLogoUrl>[0] & {
  displayName: string | null;
  manualLabel: string | null;
  displayOrder: number;
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
