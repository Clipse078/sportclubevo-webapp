import type { TournamentDto } from "@/lib/tournaments/types";
import { resolveTournamentOrganiserCrestUrlFromDomain } from "@/lib/sporting-data/sce-club-crest-resolution";
import { buildClubIdentity, type ClubIdentity } from "./club-identity";

/**
 * Organising club identity for tournaments — distinct from participating SCE team.
 * Uses Event.organizerName + pre-resolved organizerLogoUrl only (no team substitution).
 */
export function buildTournamentOrganiserClubIdentity(
  tournament: Pick<
    TournamentDto,
    "organizerName" | "organizerLogoUrl" | "title" | "organizerExternalClubId"
  >,
): ClubIdentity {
  const displayName =
    tournament.organizerName?.trim() || tournament.title?.trim() || "Turnier";

  return buildClubIdentity({
    id: tournament.organizerExternalClubId ?? undefined,
    displayName,
    logoUrl: resolveTournamentOrganiserCrestUrlFromDomain(tournament.organizerLogoUrl),
  });
}

export function buildNameOnlyClubIdentity(displayName: string): ClubIdentity {
  return buildClubIdentity({
    displayName,
    logoUrl: null,
  });
}
