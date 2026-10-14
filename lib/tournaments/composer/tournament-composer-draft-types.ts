import type {
  TournamentDressingRoomAllocationDraft,
  TournamentParticipantDraft,
  TournamentResourceAllocationDraft,
} from "@/lib/tournaments/create-tournament-orchestration";

export type TournamentComposerParticipantRow = TournamentParticipantDraft & {
  displayName: string;
  subLabel: string | null;
  externalClubLogoUrl?: string | null;
  dressingRooms: Array<{
    facilityResourceId: string;
    facilityResourceName: string;
    facilityName: string;
  }>;
};

export type TournamentComposerResourceRow = TournamentResourceAllocationDraft & {
  facilityResourceName: string;
  facilityName: string;
  code: string;
};

export type TournamentComposerPublicationValues = {
  websiteVisible: boolean;
  infoboardVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
  teamPageVisible: boolean;
};

export type TournamentComposerDraftPayload = {
  seasonId: string;
  title: string;
  description: string;
  competitionLabel: string;
  resultLabel: string;
  remarks: string;
  location: string;
  homeAway: "HOME" | "AWAY";
  startAt: string;
  endAt: string;
  meetingTime: string;
  organizerExternalClubId: string | null;
  organizerExternalClubName: string | null;
  participants: TournamentComposerParticipantRow[];
  resourceAllocations: TournamentComposerResourceRow[];
  publication: TournamentComposerPublicationValues;
};

export function createEmptyTournamentComposerDraft(): TournamentComposerDraftPayload {
  return {
    seasonId: "",
    title: "Turnier",
    description: "",
    competitionLabel: "",
    resultLabel: "",
    remarks: "",
    location: "",
    homeAway: "HOME",
    startAt: "",
    endAt: "",
    meetingTime: "",
    organizerExternalClubId: null,
    organizerExternalClubName: null,
    participants: [],
    resourceAllocations: [],
    publication: {
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: true,
      wochenplanVisible: true,
      teamPageVisible: true,
    },
  };
}
