/**
 * SCE Club & Team Selector — reusable selection projection and configuration.
 * Data source: canonical Club Directory (same universe as /dashboard/vereine).
 */

export type SceClubTeamSelectorMode = "CLUB_ONLY" | "TEAM_ONLY" | "CLUB_THEN_TEAM";

export type SceSelectableClubStatus = "active" | "archived";

export type SceSelectableClub = {
  id: string;
  name: string;
  shortName: string | null;
  alternativeName: string | null;
  logoUrl: string | null;
  status: SceSelectableClubStatus;
  teamCount: number;
};

export type SceSelectableTeam = {
  id: string;
  clubId: string;
  name: string;
  shortName: string | null;
  categoryLabel: string | null;
  ageGroup?: string | null;
  genderGroup?: string | null;
};

export type SceClubTeamSelectorFilters = {
  allowedClubIds?: readonly string[];
  allowedTeamIds?: readonly string[];
  excludeClubIds?: readonly string[];
  activeOnly?: boolean;
  writableTeamsOnly?: boolean;
  tenantClubOnly?: boolean;
  externalClubsOnly?: boolean;
};

export type SceClubTeamSelectionResult = {
  club: SceSelectableClub | null;
  team: SceSelectableTeam | null;
  /** Free-text team label when external club has no structured teams. */
  manualTeamLabel?: string | null;
};

export type SceClubTeamSelectorBrowseTab = "all" | "recent";

export type SceTenantClubContext = {
  clubId?: string | null;
  clubName: string;
  logoUrl: string | null;
};
