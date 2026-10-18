/**
 * SCE-TOURNAMENT-PLANNER-01K — public tournament read model (website-safe).
 */

import type { TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";

export type PublicTournamentPublicationState = {
  websiteVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
  teamPageVisible: boolean;
};

export type PublicTournamentHeader = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  meetingTime: string | null;
  organizerName: string | null;
  organizerLogoUrl: string | null;
  competitionLabel: string | null;
  status: string;
  season: { key: string; name: string } | null;
};

export type PublicTournamentParticipant = {
  id: string;
  displayName: string;
  crestUrl: string | null;
};

export type PublicTournamentFixtureSide = {
  label: string;
  crestUrl: string | null;
  isPlaceholder: boolean;
  participantId: string | null;
  qualificationProvenanceLabel: string | null;
};

export type PublicTournamentFixtureResult = {
  state: "UNPLAYED" | "COMPLETED";
  scoreSideA: number | null;
  scoreSideB: number | null;
};

export type PublicTournamentScheduleEntry =
  | {
      kind: "FIXTURE";
      fixtureId: string;
      sideA: PublicTournamentFixtureSide;
      sideB: PublicTournamentFixtureSide;
      startUtc: string;
      endUtc: string;
      pitchLabel: string;
      phaseLabel: string | null;
      groupLabel: string | null;
      phaseType: "GROUP_MIX" | "KNOCKOUT" | null;
      result: PublicTournamentFixtureResult | null;
      accessibleLabel: string;
      scheduleState: "UPCOMING" | "COMPLETED";
    }
  | {
      kind: "BREAK";
      breakId: string;
      label: string;
      startUtc: string;
      endUtc: string;
      scopeLabel: string;
      accessibleLabel: string;
    };

export type PublicTournamentScheduleSection = {
  sectionId: string;
  title: string;
  entries: readonly PublicTournamentScheduleEntry[];
};

export type PublicTournamentGroupStandingsRow = {
  position: number;
  participantId: string;
  displayName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  tiedAtPosition: boolean;
};

export type PublicTournamentGroupStandingsSection = {
  groupId: string;
  groupLabel: string;
  rows: readonly PublicTournamentGroupStandingsRow[];
};

export type PublicTournamentViewModel = {
  tournament: PublicTournamentHeader;
  participants: readonly PublicTournamentParticipant[];
  /** Canonical Spielplan projection (master + team plans). */
  spielplan: TournamentSpielplanViewModel;
  scheduleSections: readonly PublicTournamentScheduleSection[];
  mobileTimeline: readonly PublicTournamentScheduleEntry[];
  groupStandings: readonly PublicTournamentGroupStandingsSection[];
  publication: PublicTournamentPublicationState;
  /** Stable public page path (relative, tenant-scoped). */
  publicPath: string;
  generatedAt: string;
};
