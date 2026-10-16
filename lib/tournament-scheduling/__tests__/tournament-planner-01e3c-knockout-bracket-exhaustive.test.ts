/**
 * SCE-TOURNAMENT-PLANNER-01E3C-R1 — exhaustive knockout topology closure (N = 2..128).
 */

import { describe, expect, it } from "vitest";
import {
  assertKnockoutBracketTopologyClosed,
  validateKnockoutBracketTopology,
} from "../knockout-bracket/knockout-bracket-invariants";
import {
  generateKnockoutBracketPure,
  smallestPowerOfTwoGte,
} from "../knockout-bracket/knockout-bracket-pure";
import type { KnockoutEntrantInput } from "../knockout-bracket/knockout-bracket-types";

const STAGE_KEY = "KO";

function concreteParticipants(n: number): KnockoutEntrantInput[] {
  return Array.from({ length: n }, (_, index) => ({
    kind: "CONCRETE_PARTICIPANT" as const,
    participantId: `p-${index + 1}`,
  }));
}

function mixedEntrants(n: number): KnockoutEntrantInput[] {
  return Array.from({ length: n }, (_, index) =>
    index % 2 === 0
      ? {
          kind: "QUALIFICATION_REFERENCE" as const,
          qualificationSourceId: `qs-${index + 1}`,
        }
      : {
          kind: "CONCRETE_PARTICIPANT" as const,
          participantId: `p-${index + 1}`,
        },
  );
}

describe("01E3C-R1 — exhaustive knockout invariants N=2..128", () => {
  it("all entrant counts satisfy closure invariants", () => {
    for (let n = 2; n <= 128; n += 1) {
      const entrants = concreteParticipants(n);
      const result = generateKnockoutBracketPure({ stageKey: STAGE_KEY, entrants });
      assertKnockoutBracketTopologyClosed(result, STAGE_KEY, entrants);
      const metrics = validateKnockoutBracketTopology(result, STAGE_KEY);
      expect(metrics.orphanedInitialEntrantSourceCount).toBe(0);
      expect(metrics.orphanedWinnerSourceCount).toBe(0);
      expect(metrics.danglingKnockoutSideSourceCount).toBe(0);
      expect(metrics.duplicatedActiveBracketSourceCount).toBe(0);
      expect(metrics.knockoutBracketDag).toBe(true);
      expect(result.diagnostics.bracketSize).toBe(smallestPowerOfTwoGte(n));
      expect(result.diagnostics.byeCount).toBe(result.diagnostics.bracketSize - n);
      expect(result.fixtures).toHaveLength(n - 1);
    }
  });
});

describe("01E3C-R1 — mixed-source BYE matrix", () => {
  it.each([3, 5, 6, 7, 9, 12])("N=%i mixed concrete + GROUP_RANK sources", (n) => {
    const entrants = mixedEntrants(n);
    const result = generateKnockoutBracketPure({ stageKey: STAGE_KEY, entrants });
    assertKnockoutBracketTopologyClosed(result, STAGE_KEY, entrants);
  });
});

describe("01E3C-R1 — explicit non-power-of-two proofs", () => {
  it("N=3: bracket 4, 1 BYE, 2 real fixtures, BYE entrant on final as concrete", () => {
    const entrants = concreteParticipants(3);
    const result = generateKnockoutBracketPure({ stageKey: STAGE_KEY, entrants });
    expect(result.diagnostics.bracketSize).toBe(4);
    expect(result.diagnostics.byeCount).toBe(1);
    expect(result.fixtures).toHaveLength(2);
    const finalRound = Math.max(...result.fixtures.map((fixture) => fixture.roundIndex));
    expect(result.fixtures.filter((fixture) => fixture.roundIndex === finalRound)).toHaveLength(1);
    const final = result.fixtures.find((fixture) => fixture.roundIndex === finalRound)!;
    expect(final.sides.sideA.type === "CONCRETE_PARTICIPANT" || final.sides.sideB.type === "CONCRETE_PARTICIPANT").toBe(
      true,
    );
    expect(
      final.sides.sideA.type === "WINNER_OF_FIXTURE" || final.sides.sideB.type === "WINNER_OF_FIXTURE",
    ).toBe(true);
    const byeSide =
      final.sides.sideA.type === "CONCRETE_PARTICIPANT" ? final.sides.sideA : final.sides.sideB;
    expect(byeSide.type).toBe("CONCRETE_PARTICIPANT");
    if (byeSide.type === "CONCRETE_PARTICIPANT") {
      expect(byeSide.participantId).toBe("p-1");
    }
    assertKnockoutBracketTopologyClosed(result, STAGE_KEY, entrants);
  });

  it.each([
    [5, 8, 3, 4],
    [6, 8, 2, 5],
    [7, 8, 1, 6],
    [9, 16, 7, 8],
    [10, 16, 6, 9],
    [12, 16, 4, 11],
    [17, 32, 15, 16],
  ])("N=%i → bracket %i, bye %i, fixtures %i", (n, bracket, bye, fixtures) => {
    const entrants = concreteParticipants(n);
    const result = generateKnockoutBracketPure({ stageKey: STAGE_KEY, entrants });
    expect(result.diagnostics.bracketSize).toBe(bracket);
    expect(result.diagnostics.byeCount).toBe(bye);
    expect(result.fixtures).toHaveLength(fixtures);
    assertKnockoutBracketTopologyClosed(result, STAGE_KEY, entrants);
  });
});

describe("01E3C-R1 — power-of-two regression (0 BYEs)", () => {
  it.each([2, 4, 8, 16, 32, 64, 128])("N=%i", (n) => {
    const entrants = concreteParticipants(n);
    const result = generateKnockoutBracketPure({ stageKey: STAGE_KEY, entrants });
    expect(result.diagnostics.byeCount).toBe(0);
    expect(result.fixtures).toHaveLength(n - 1);
    assertKnockoutBracketTopologyClosed(result, STAGE_KEY, entrants);
  });
});

describe("01E3C-R1 — concrete and GROUP_RANK BYE source preservation", () => {
  it("concrete BYE advances participant id without WINNER_OF_FIXTURE wrapper", () => {
    const entrants = concreteParticipants(3);
    const result = generateKnockoutBracketPure({ stageKey: STAGE_KEY, entrants });
    const byeAdvance = result.diagnostics.byeAdvancements[0];
    expect(byeAdvance?.entrant).toEqual({ kind: "CONCRETE_PARTICIPANT", participantId: "p-1" });
    const finalRound = Math.max(...result.fixtures.map((fixture) => fixture.roundIndex));
    const final = result.fixtures.find((fixture) => fixture.roundIndex === finalRound)!;
    const concreteOnFinal = [final.sides.sideA, final.sides.sideB].find(
      (side) => side.type === "CONCRETE_PARTICIPANT",
    );
    expect(concreteOnFinal).toEqual({ type: "CONCRETE_PARTICIPANT", participantId: "p-1" });
  });

  it("GROUP_RANK BYE retains qualification reference on later side", () => {
    const entrants: KnockoutEntrantInput[] = [
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-1a" },
      { kind: "CONCRETE_PARTICIPANT", participantId: "p-2" },
      { kind: "CONCRETE_PARTICIPANT", participantId: "p-3" },
    ];
    const result = generateKnockoutBracketPure({ stageKey: STAGE_KEY, entrants });
    const finalRound = Math.max(...result.fixtures.map((fixture) => fixture.roundIndex));
    const final = result.fixtures.find((fixture) => fixture.roundIndex === finalRound)!;
    const qualSide = [final.sides.sideA, final.sides.sideB].find(
      (side) => side.type === "QUALIFICATION_REFERENCE",
    );
    expect(qualSide).toEqual({
      type: "QUALIFICATION_REFERENCE",
      qualificationSourceId: "qs-1a",
    });
  });
});

describe("01E3C-R1 — GROUP_PLUS_KNOCKOUT structural handoff", () => {
  it("semifinals use GROUP_RANK; final uses WINNER_OF_FIXTURE only", () => {
    const entrants: KnockoutEntrantInput[] = [
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-1a" },
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-2b" },
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-1b" },
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-2a" },
    ];
    const result = generateKnockoutBracketPure({ stageKey: STAGE_KEY, entrants });
    const semis = result.fixtures.filter((fixture) => fixture.roundIndex === 0);
    expect(semis).toHaveLength(2);
    for (const fixture of semis) {
      expect(fixture.sides.sideA.type).toBe("QUALIFICATION_REFERENCE");
      expect(fixture.sides.sideB.type).toBe("QUALIFICATION_REFERENCE");
    }
    const finalRound = Math.max(...result.fixtures.map((fixture) => fixture.roundIndex));
    const final = result.fixtures.find((fixture) => fixture.roundIndex === finalRound)!;
    expect(final.sides.sideA.type).toBe("WINNER_OF_FIXTURE");
    expect(final.sides.sideB.type).toBe("WINNER_OF_FIXTURE");
    assertKnockoutBracketTopologyClosed(result, STAGE_KEY, entrants);
  });
});
