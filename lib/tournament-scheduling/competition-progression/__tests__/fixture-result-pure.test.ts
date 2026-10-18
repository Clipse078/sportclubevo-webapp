/**
 * SCE-TOURNAMENT-PLANNER-01J — fixture result pure validation tests.
 */

import { describe, expect, it } from "vitest";
import {
  TournamentFixtureResultValidationError,
  validateAndResolveFixtureResult,
} from "../fixture-result-pure";
import { calculateProgressionImpact } from "../progression-impact-pure";
import type { ProgressionFixtureRow } from "../qualification-resolution-pure";

describe("01J fixture result validation", () => {
  it("accepts valid group draw", () => {
    const result = validateAndResolveFixtureResult({
      sideAParticipantId: "a",
      sideBParticipantId: "b",
      scoreSideA: 1,
      scoreSideB: 1,
      requiresExplicitWinner: false,
    });
    expect(result.winnerParticipantId).toBeNull();
  });

  it("rejects KO draw without explicit winner", () => {
    expect(() =>
      validateAndResolveFixtureResult({
        sideAParticipantId: "a",
        sideBParticipantId: "b",
        scoreSideA: 1,
        scoreSideB: 1,
        requiresExplicitWinner: true,
      }),
    ).toThrow(TournamentFixtureResultValidationError);
  });

  it("accepts KO draw with explicit winner", () => {
    const result = validateAndResolveFixtureResult({
      sideAParticipantId: "a",
      sideBParticipantId: "b",
      scoreSideA: 1,
      scoreSideB: 1,
      requiresExplicitWinner: true,
      explicitWinnerParticipantId: "b",
    });
    expect(result.winnerParticipantId).toBe("b");
  });

  it("rejects invalid score", () => {
    expect(() =>
      validateAndResolveFixtureResult({
        sideAParticipantId: "a",
        sideBParticipantId: "b",
        scoreSideA: -1,
        scoreSideB: 0,
        requiresExplicitWinner: false,
      }),
    ).toThrow(TournamentFixtureResultValidationError);
  });

  it("J. completed downstream blocks destructive upstream correction", () => {
    const fixtures: ProgressionFixtureRow[] = [
      {
        fixtureId: "sf1",
        tournamentGroupId: null,
        phaseType: "KNOCKOUT",
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
        sides: [],
      },
      {
        fixtureId: "final",
        tournamentGroupId: null,
        phaseType: "KNOCKOUT",
        sideAParticipantId: null,
        sideBParticipantId: null,
        sides: [
          {
            fixtureId: "final",
            side: "A",
            sourceType: "QUALIFICATION_REFERENCE",
            participantId: "p1",
            qualificationSourceId: "qs-w",
          },
          {
            fixtureId: "final",
            side: "B",
            sourceType: "CONCRETE_PARTICIPANT",
            participantId: "p9",
            qualificationSourceId: null,
          },
        ],
      },
    ];
    const impact = calculateProgressionImpact({
      mutatedFixtureId: "sf1",
      fixtures,
      qualificationSourceTypeById: new Map([["qs-w", "WINNER_OF_FIXTURE"]]),
      qualificationSourceFixtureIdById: new Map([["qs-w", "sf1"]]),
      qualificationSourceGroupIdById: new Map([["qs-w", null]]),
      completedFixtureIds: new Set(["final"]),
      mutatedFixtureGroupId: null,
    });
    expect(impact.blocked).toBe(true);
    expect(impact.completedDownstreamFixtureIds).toContain("final");
  });
});
