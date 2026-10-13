export type ClubEventOrganisationalScope = "CLUB_WIDE" | "SELECTED_ORG_UNITS";

export type ClubEventOrganisationalAudienceTargetKind = "TEAM" | "ORG_UNIT";

export type ClubEventOrganisationalAudienceTargetRef = {
  kind: ClubEventOrganisationalAudienceTargetKind;
  id: string;
};

export type ClubEventOrganisationalAudienceTargetDto = ClubEventOrganisationalAudienceTargetRef & {
  label: string;
};

export type ClubEventOrganisationalAudienceDto = {
  scope: ClubEventOrganisationalScope;
  teamIds: string[];
  orgUnitIds: string[];
  targets: ClubEventOrganisationalAudienceTargetDto[];
};

export function emptyClubEventOrganisationalAudienceDto(): ClubEventOrganisationalAudienceDto {
  return {
    scope: "CLUB_WIDE",
    teamIds: [],
    orgUnitIds: [],
    targets: [],
  };
}

export type ClubEventOrganisationalAudienceInput = {
  scope: ClubEventOrganisationalScope;
  targets?: readonly ClubEventOrganisationalAudienceTargetRef[];
  /** Legacy flat shape accepted by API clients. */
  teamIds?: readonly string[];
  orgUnitIds?: readonly string[];
};
