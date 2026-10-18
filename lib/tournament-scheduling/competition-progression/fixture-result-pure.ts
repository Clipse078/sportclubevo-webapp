/**
 * SCE-TOURNAMENT-PLANNER-01J — fixture result validation + winner resolution (pure).
 */

export type TournamentFixtureResultState = "UNPLAYED" | "COMPLETED";

export type FixtureSideIdentity = {
  side: "A" | "B";
  participantId: string | null;
};

export type ValidatedFixtureResult = {
  state: TournamentFixtureResultState;
  scoreSideA: number;
  scoreSideB: number;
  winnerParticipantId: string | null;
};

export class TournamentFixtureResultValidationError extends Error {
  readonly code:
    | "INVALID_SCORE"
    | "MISSING_PARTICIPANT"
    | "KO_DRAW_WITHOUT_WINNER"
    | "WINNER_NOT_IN_FIXTURE"
    | "WINNER_MISMATCH";

  constructor(
    code: TournamentFixtureResultValidationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "TournamentFixtureResultValidationError";
    this.code = code;
  }
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function validateAndResolveFixtureResult(input: {
  sideAParticipantId: string | null;
  sideBParticipantId: string | null;
  scoreSideA: number;
  scoreSideB: number;
  requiresExplicitWinner: boolean;
  explicitWinnerParticipantId?: string | null;
}): ValidatedFixtureResult {
  if (!isNonNegativeInteger(input.scoreSideA) || !isNonNegativeInteger(input.scoreSideB)) {
    throw new TournamentFixtureResultValidationError(
      "INVALID_SCORE",
      "Scores must be non-negative integers.",
    );
  }
  if (!input.sideAParticipantId || !input.sideBParticipantId) {
    throw new TournamentFixtureResultValidationError(
      "MISSING_PARTICIPANT",
      "Both fixture sides must have concrete participants before recording a result.",
    );
  }

  let winnerParticipantId: string | null = null;
  if (input.scoreSideA > input.scoreSideB) {
    winnerParticipantId = input.sideAParticipantId;
  } else if (input.scoreSideB > input.scoreSideA) {
    winnerParticipantId = input.sideBParticipantId;
  } else if (input.requiresExplicitWinner) {
    const explicit = input.explicitWinnerParticipantId ?? null;
    if (!explicit) {
      throw new TournamentFixtureResultValidationError(
        "KO_DRAW_WITHOUT_WINNER",
        "Knockout fixtures require an explicit winner when the score is tied.",
      );
    }
    if (
      explicit !== input.sideAParticipantId &&
      explicit !== input.sideBParticipantId
    ) {
      throw new TournamentFixtureResultValidationError(
        "WINNER_NOT_IN_FIXTURE",
        "Winner must be one of the fixture participants.",
      );
    }
    winnerParticipantId = explicit;
  }

  if (
    input.explicitWinnerParticipantId &&
    winnerParticipantId &&
    input.explicitWinnerParticipantId !== winnerParticipantId &&
    input.scoreSideA !== input.scoreSideB
  ) {
    throw new TournamentFixtureResultValidationError(
      "WINNER_MISMATCH",
      "Explicit winner does not match the scoreline.",
    );
  }

  return {
    state: "COMPLETED",
    scoreSideA: input.scoreSideA,
    scoreSideB: input.scoreSideB,
    winnerParticipantId,
  };
}

export function resolveConcreteSideParticipantIds(input: {
  sideAParticipantId: string | null;
  sideBParticipantId: string | null;
  sides: readonly {
    side: "A" | "B";
    participantId: string | null;
  }[];
}): { sideA: string | null; sideB: string | null } {
  const sideA =
    input.sideAParticipantId ??
    input.sides.find((s) => s.side === "A")?.participantId ??
    null;
  const sideB =
    input.sideBParticipantId ??
    input.sides.find((s) => s.side === "B")?.participantId ??
    null;
  return { sideA, sideB };
}
