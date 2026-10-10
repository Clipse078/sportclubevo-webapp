import type { ParticipationResponseStatus, PlayerSquadStatus } from "@prisma/client";
import type { MatchPlayerAvailability } from "@/lib/match-squad/availability-adapter";

export type MatchSquadPlayerPresentation = {
  personId: string;
  displayName: string;
  shirtNumber: number | null;
  sortOrder: number;
  rosterEligible: boolean;
  rosterIneligibleLabel: string | null;
  rosterStatus: PlayerSquadStatus | null;
  availability: MatchPlayerAvailability;
  availabilityLabel: string;
  participationStatus: ParticipationResponseStatus | null;
  participationNote: string | null;
  selected: boolean;
  availabilityConflict: boolean;
  staleRosterSelection: boolean;
  canSelect: boolean;
  canRemove: boolean;
};

export type MatchSquadCounts = {
  rosterTotal: number;
  available: number;
  unavailable: number;
  unknown: number;
  selected: number;
  selectedAvailable: number;
  selectedUnknown: number;
  conflicts: number;
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
  counts: MatchSquadCounts;
};
