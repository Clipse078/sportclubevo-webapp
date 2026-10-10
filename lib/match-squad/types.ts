export type MatchSquadPlayerPresentation = {
  personId: string;
  displayName: string;
  shirtNumber: number | null;
  sortOrder: number;
  rosterEligible: boolean;
  rosterIneligibleLabel: string | null;
};

export type MatchSquadViewModel = {
  eventId: string;
  teamId: string;
  teamSeasonId: string;
  teamDisplayName: string | null;
  version: string;
  editable: boolean;
  readOnlyReason: string | null;
  selected: MatchSquadPlayerPresentation[];
  remaining: MatchSquadPlayerPresentation[];
  selectedPersonIds: string[];
  remainingPersonIds: string[];
};
