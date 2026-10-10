import type {
  ParticipationResponseSource,
  ParticipationResponseStatus,
  PlayerSquadStatus,
} from "@prisma/client";
import type { MatchPlayerAvailability } from "@/lib/match-squad/availability-adapter";
import type {
  MatchAvailabilityTone,
  MatchParticipationPresentationStatus,
} from "@/lib/match-squad/match-availability-presentation";

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
  presentationStatus: MatchParticipationPresentationStatus;
  presentationTone: MatchAvailabilityTone;
  presentationIcon: "check" | "x" | "help" | "circle";
  participationStatus: ParticipationResponseStatus | null;
  participationNote: string | null;
  responseSource: ParticipationResponseSource | null;
  responseProvenanceLabel: string | null;
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
  maybe: number;
  open: number;
  selected: number;
  selectedAvailable: number;
  selectedMaybe: number;
  selectedOpen: number;
  conflicts: number;
};

export type MatchAvailabilityCollectionMetaView = {
  participationResponseDueAt: string | null;
  participationReminder1At: string | null;
  participationReminder2At: string | null;
  participationReminder1PresetKey: string | null;
  participationReminder2PresetKey: string | null;
  requestActive: boolean;
  readOnlyReason: string | null;
  canConfigureRequest: boolean;
  canSendReminder: boolean;
  reminderCandidateId: string;
  outstandingPlayerCount: number;
  reminderDeliveryTargetCount: number | null;
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
  availabilityCollection?: MatchAvailabilityCollectionMetaView;
};
