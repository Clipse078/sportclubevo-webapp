/**
 * SCE-TOURNAMENT-PLANNER-01K — canonical Spielplan presentation model (read-only projection).
 */

export type TournamentSpielplanIdentity = {
  tournamentId: string;
  title: string;
  dateLabel: string;
  location: string | null;
  organizerName: string | null;
  tenantName: string | null;
  tenantLogoUrl: string | null;
  timezone: string;
};

export type TournamentSpielplanPitchColumn = {
  pitchId: string;
  displayOrder: number;
  label: string;
};

export type TournamentSpielplanFixturePresentation = {
  fixtureId: string;
  sideALabel: string;
  sideBLabel: string;
  sideAParticipantId: string | null;
  sideBParticipantId: string | null;
  sideAIsPlaceholder: boolean;
  sideBIsPlaceholder: boolean;
  pairingLabel: string;
  startUtc: string;
  endUtc: string;
  pitchId: string;
  pitchLabel: string;
  roundTitle: string | null;
  result: { scoreSideA: number; scoreSideB: number } | null;
};

export type TournamentSpielplanPitchCell =
  | { kind: "EMPTY" }
  | {
      kind: "FIXTURE";
      fixtureId: string;
      pairingLabel: string;
      sideAParticipantId: string | null;
      sideBParticipantId: string | null;
      result: { scoreSideA: number; scoreSideB: number } | null;
    }
  | { kind: "PITCH_BLOCKED"; label: string };

export type TournamentSpielplanMatrixRow =
  | {
      kind: "ALL_PITCHES_BREAK";
      rowId: string;
      startUtc: string;
      endUtc: string;
      timeLabel: string;
      label: string;
    }
  | {
      kind: "SCHEDULE_SLOT";
      rowId: string;
      startUtc: string;
      timeLabel: string;
      roundTitle: string | null;
      cellsByPitchId: Readonly<Record<string, TournamentSpielplanPitchCell>>;
    };

export type TournamentSpielplanMobilePitchEntry = {
  pitchLabel: string;
  cell: TournamentSpielplanPitchCell;
};

export type TournamentSpielplanMobileSlot = {
  slotId: string;
  startUtc: string;
  timeLabel: string;
  roundTitle: string | null;
  kind: "FIXTURES" | "ALL_PITCHES_BREAK";
  breakLabel?: string;
  pitches: readonly TournamentSpielplanMobilePitchEntry[];
};

export type TournamentSpielplanTeamEntry =
  | {
      kind: "MATCH";
      fixtureId: string;
      startUtc: string;
      timeLabel: string;
      pitchLabel: string;
      opponentLabel: string;
      roundTitle: string | null;
      result: { scoreSideA: number; scoreSideB: number } | null;
      scoreLabel: string | null;
    }
  | {
      kind: "BREAK";
      startUtc: string;
      timeLabel: string;
      label: string;
      scopeLabel: string;
    };

export type TournamentSpielplanTeamPlan = {
  participantId: string;
  displayName: string;
  crestUrl: string | null;
  entries: readonly TournamentSpielplanTeamEntry[];
};

export type TournamentSpielplanParticipantOption = {
  participantId: string;
  displayName: string;
  crestUrl: string | null;
};

export type TournamentSpielplanViewModel = {
  identity: TournamentSpielplanIdentity;
  pitches: readonly TournamentSpielplanPitchColumn[];
  fixtures: readonly TournamentSpielplanFixturePresentation[];
  matrixRows: readonly TournamentSpielplanMatrixRow[];
  mobileSlots: readonly TournamentSpielplanMobileSlot[];
  participants: readonly TournamentSpielplanParticipantOption[];
  teamPlans: readonly TournamentSpielplanTeamPlan[];
};
