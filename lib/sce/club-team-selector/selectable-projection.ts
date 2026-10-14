import type { ExternalClubSummaryDto, ExternalTeamSummaryDto } from "@/lib/club-directory/types";
import type { ClubDirectoryClientClub } from "@/lib/club-directory/club-directory-client";
import type { SceSelectableClub, SceSelectableTeam } from "./types";

export function projectClubSummaryDtoToSelectable(club: ExternalClubSummaryDto): SceSelectableClub {
  return {
    id: club.id,
    name: club.name,
    shortName: club.shortName,
    alternativeName: club.alternativeName,
    logoUrl: club.logoUrl,
    status: club.archivedAt ? "archived" : "active",
    teamCount: club.teamCount,
  };
}

export function projectClientClubToSelectable(club: ClubDirectoryClientClub): SceSelectableClub {
  return {
    id: club.id,
    name: club.name,
    shortName: club.shortName,
    alternativeName: club.alternativeName ?? null,
    logoUrl: club.logoUrl,
    status: club.archivedAt ? "archived" : "active",
    teamCount: club.teamCount ?? 0,
  };
}

export function projectTeamSummaryDtoToSelectable(team: ExternalTeamSummaryDto): SceSelectableTeam {
  return {
    id: team.id,
    clubId: team.externalClubId,
    name: team.name,
    shortName: team.shortName,
    categoryLabel: team.categoryLabel,
  };
}

export function buildSelectableClubSearchHaystack(club: SceSelectableClub): string {
  return [club.name, club.shortName, club.alternativeName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
}
