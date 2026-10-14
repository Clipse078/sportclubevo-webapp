export type MatchComposerResourceSelection = {
  facilityResourceId: string;
  facilityResourceName: string;
  code: string;
  kind: "pitch_hall" | "dressing_room_home" | "dressing_room_away";
};

export type MatchComposerPublicationValues = {
  websiteVisible: boolean;
  infoboardVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
  teamPageVisible: boolean;
};

export type MatchComposerSpielbetriebValues = {
  competitionLabel: string;
  remarks: string;
};

export type MatchComposerDraftPayload = {
  seasonId: string;
  teamId: string;
  teamDisplayName: string;
  homeAway: "HOME" | "AWAY";
  location: string;
  opponentName: string;
  opponentExternalClubId: string | null;
  opponentExternalClubName: string | null;
  startAt: string;
  endAt: string;
  resources: MatchComposerResourceSelection[];
  publication: MatchComposerPublicationValues;
  spielbetrieb: MatchComposerSpielbetriebValues;
};

export function createEmptyMatchComposerDraft(): MatchComposerDraftPayload {
  return {
    seasonId: "",
    teamId: "",
    teamDisplayName: "",
    homeAway: "HOME",
    location: "",
    opponentName: "",
    opponentExternalClubId: null,
    opponentExternalClubName: null,
    startAt: "",
    endAt: "",
    resources: [],
    publication: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: true,
      teamPageVisible: true,
    },
    spielbetrieb: {
      competitionLabel: "",
      remarks: "",
    },
  };
}
