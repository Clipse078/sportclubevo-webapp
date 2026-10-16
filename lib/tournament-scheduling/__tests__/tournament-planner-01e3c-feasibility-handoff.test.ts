/**
 * SCE-TOURNAMENT-PLANNER-01E3C — 01D structural handoff for unresolved knockout sides.
 */

import { describe, expect, it } from "vitest";
import { resolveFixtureSidesForFeasibility } from "../competition-structure/unresolved-fixture-feasibility";
import { generateKnockoutBracketPure } from "../knockout-bracket/knockout-bracket-pure";

describe("01E3C → 01D handoff", () => {
  it("marks qualification-reference knockout sides as unresolved for participant-rest", () => {
    const { fixtures } = generateKnockoutBracketPure({
      stageKey: "KO",
      entrants: [
        { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-1a" },
        { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-2b" },
        { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-1b" },
        { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-2a" },
      ],
    });

    const firstRound = fixtures.filter((f) => f.roundIndex === 0);
    for (const fixture of firstRound) {
      const resolution = resolveFixtureSidesForFeasibility({
        sideAParticipantId: null,
        sideBParticipantId: null,
        sideSources: [
          {
            side: "A",
            sourceType:
              fixture.sides.sideA.type === "CONCRETE_PARTICIPANT"
                ? "CONCRETE_PARTICIPANT"
                : "QUALIFICATION_REFERENCE",
            participantId:
              fixture.sides.sideA.type === "CONCRETE_PARTICIPANT"
                ? fixture.sides.sideA.participantId
                : null,
          },
          {
            side: "B",
            sourceType:
              fixture.sides.sideB.type === "CONCRETE_PARTICIPANT"
                ? "CONCRETE_PARTICIPANT"
                : "QUALIFICATION_REFERENCE",
            participantId:
              fixture.sides.sideB.type === "CONCRETE_PARTICIPANT"
                ? fixture.sides.sideB.participantId
                : null,
          },
        ],
      });
      expect(resolution.hasUnresolvedSide).toBe(true);
      expect(resolution.sideAParticipantId).toBeNull();
      expect(resolution.sideBParticipantId).toBeNull();
    }
  });
});
