import type { TournamentDto } from "@/lib/tournaments/types";
import { buildClubIdentity, type ClubIdentity } from "./club-identity";
import { resolveTournamentOrganiserClubLogoUrl } from "./logo-resolution";

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
    logoUrl: resolveTournamentOrganiserClubLogoUrl(tournament.organizerLogoUrl),
  });
}

export function buildNameOnlyClubIdentity(displayName: string): ClubIdentity {
  return buildClubIdentity({
    displayName,
    logoUrl: null,
  });
}
