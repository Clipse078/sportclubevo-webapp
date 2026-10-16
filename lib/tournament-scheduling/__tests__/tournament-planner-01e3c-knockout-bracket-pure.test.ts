/**
 * SCE-TOURNAMENT-PLANNER-01E3C — pure knockout bracket + BYE tests.
 */

import { describe, expect, it } from "vitest";
import {
  buildBracketSeedOrder,
  computeKnockoutByeCount,
  generateKnockoutBracketPure,
  KnockoutBracketValidationError,
  smallestPowerOfTwoGte,
} from "../knockout-bracket/knockout-bracket-pure";
import type {
  GeneratedKnockoutFixtureSpec,
  KnockoutEntrantInput,
} from "../knockout-bracket/knockout-bracket-types";

function participants(n: number): KnockoutEntrantInput[] {
  return Array.from({ length: n }, (_, index) => ({
    kind: "CONCRETE_PARTICIPANT" as const,
    participantId: `p-${index + 1}`,
  }));
}

function assertNoFakeByeParticipants(fixtures: GeneratedKnockoutFixtureSpec[]): void {
  for (const fixture of fixtures) {
    for (const side of [fixture.sides.sideA, fixture.sides.sideB]) {
      if (side.type === "CONCRETE_PARTICIPANT") {
        expect(side.participantId).not.toMatch(/BYE|Freilos|TBD/i);
      }
    }
  }
}

function collectWinnerReferences(
  fixtures: GeneratedKnockoutFixtureSpec[],
): Map<string, { sideA: string; sideB: string }> {
  const byKey = new Map(fixtures.map((f) => [f.logicalFixtureKey, f]));
  const refs = new Map<string, { sideA: string; sideB: string }>();
  for (const fixture of fixtures) {
    const describeSide = (side: GeneratedKnockoutFixtureSpec["sides"]["sideA"]): string => {
      if (side.type === "CONCRETE_PARTICIPANT") {
        return side.participantId;
      }
      if (side.type === "QUALIFICATION_REFERENCE") {
        return side.qualificationSourceId;
      }
      return `WINNER(${side.logicalFixtureKey})`;
    };
    refs.set(fixture.logicalFixtureKey, {
      sideA: describeSide(fixture.sides.sideA),
      sideB: describeSide(fixture.sides.sideB),
    });
  }
  void byKey;
  return refs;
}

function assertKnockoutDag(fixtures: GeneratedKnockoutFixtureSpec[]): void {
  const keys = new Set(fixtures.map((f) => f.logicalFixtureKey));
  for (const fixture of fixtures) {
    for (const side of [fixture.sides.sideA, fixture.sides.sideB]) {
      if (side.type === "WINNER_OF_FIXTURE") {
        expect(keys.has(side.logicalFixtureKey)).toBe(true);
        const source = fixtures.find((f) => f.logicalFixtureKey === side.logicalFixtureKey)!;
        expect(source.roundIndex).toBeLessThan(fixture.roundIndex);
      }
    }
  }
}

describe("01E3C — bracket size and BYE count", () => {
  it.each([
    [2, 2, 0],
    [3, 4, 1],
    [4, 4, 0],
    [5, 8, 3],
    [6, 8, 2],
    [7, 8, 1],
    [8, 8, 0],
    [9, 16, 7],
    [12, 16, 4],
    [16, 16, 0],
    [17, 32, 15],
  ])("N=%i → bracket %i, bye %i", (n, bracket, bye) => {
    expect(smallestPowerOfTwoGte(n)).toBe(bracket);
    expect(computeKnockoutByeCount(n, bracket)).toBe(bye);
  });

  it("builds deterministic standard seed order for 8", () => {
    expect(buildBracketSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});

describe("01E3C — concrete knockout brackets", () => {
  it("rejects fewer than two entrants", () => {
    expect(() =>
      generateKnockoutBracketPure({ stageKey: "KO", entrants: participants(1) }),
    ).toThrow(KnockoutBracketValidationError);
  });

  it("8 concrete participants → 7 fixtures, 0 BYEs, final at highest round", () => {
    const { fixtures, diagnostics } = generateKnockoutBracketPure({
      stageKey: "KO",
      entrants: participants(8),
    });
    expect(diagnostics.byeCount).toBe(0);
    expect(diagnostics.realFixtureCount).toBe(7);
    expect(fixtures).toHaveLength(7);
    expect(new Set(fixtures.map((f) => f.generatorKey)).size).toBe(7);
    const finalRound = Math.max(...fixtures.map((f) => f.roundIndex));
    const finals = fixtures.filter((f) => f.roundIndex === finalRound);
    expect(finals).toHaveLength(1);
    assertNoFakeByeParticipants(fixtures);
    assertKnockoutDag(fixtures);
  });

  it("6 concrete participants → 5 fixtures, 2 BYEs, no fake BYE fixtures", () => {
    const { fixtures, diagnostics } = generateKnockoutBracketPure({
      stageKey: "KO",
      entrants: participants(6),
    });
    expect(diagnostics.bracketSize).toBe(8);
    expect(diagnostics.byeCount).toBe(2);
    expect(fixtures).toHaveLength(5);
    expect(diagnostics.byeAdvancements).toHaveLength(2);
    assertNoFakeByeParticipants(fixtures);
    assertKnockoutDag(fixtures);
  });

  it("5 concrete participants → 4 fixtures, 3 BYEs", () => {
    const { fixtures, diagnostics } = generateKnockoutBracketPure({
      stageKey: "KO",
      entrants: participants(5),
    });
    expect(diagnostics.byeCount).toBe(3);
    expect(fixtures).toHaveLength(4);
    assertNoFakeByeParticipants(fixtures);
  });

  it("3 concrete participants → 2 fixtures, 1 BYE, final mixes BYE entrant and winner", () => {
    const { fixtures, diagnostics } = generateKnockoutBracketPure({
      stageKey: "KO",
      entrants: participants(3),
    });
    expect(diagnostics.byeCount).toBe(1);
    expect(fixtures).toHaveLength(2);
    const finalRound = Math.max(...fixtures.map((f) => f.roundIndex));
    const final = fixtures.find((f) => f.roundIndex === finalRound)!;
    const sideTypes = [final.sides.sideA.type, final.sides.sideB.type];
    expect(sideTypes).toContain("CONCRETE_PARTICIPANT");
    expect(sideTypes).toContain("WINNER_OF_FIXTURE");
  });

  it.each([2, 4, 8, 16, 32])("power-of-two N=%i → N-1 fixtures, 0 BYEs", (n) => {
    const { fixtures, diagnostics } = generateKnockoutBracketPure({
      stageKey: "KO",
      entrants: participants(n),
    });
    expect(diagnostics.byeCount).toBe(0);
    expect(fixtures).toHaveLength(n - 1);
  });

  it.each([3, 5, 6, 7, 9, 10, 12, 17])(
    "non-power-of-two N=%i satisfies real fixture count N-1 and DAG",
    (n) => {
      const { fixtures, diagnostics } = generateKnockoutBracketPure({
        stageKey: "KO",
        entrants: participants(n),
      });
      expect(diagnostics.realFixtureCount).toBe(n - 1);
      expect(diagnostics.bracketSize).toBe(smallestPowerOfTwoGte(n));
      expect(diagnostics.byeCount).toBe(diagnostics.bracketSize - n);
      assertKnockoutDag(fixtures);
      expect(fixtures.filter((f) => f.roundIndex === Math.max(...fixtures.map((x) => x.roundIndex)))).toHaveLength(1);
    },
  );

  it("supports duplicate source-team participants as distinct entrants", () => {
    const entrants: KnockoutEntrantInput[] = [
      { kind: "CONCRETE_PARTICIPANT", participantId: "tp-fca-rot" },
      { kind: "CONCRETE_PARTICIPANT", participantId: "tp-fca-blau" },
    ];
    const { fixtures } = generateKnockoutBracketPure({ stageKey: "KO", entrants });
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]!.sides.sideA.type).toBe("CONCRETE_PARTICIPANT");
    expect(fixtures[0]!.sides.sideB.type).toBe("CONCRETE_PARTICIPANT");
  });

  it("is deterministic for identical input", () => {
    const input = { stageKey: "KO", entrants: participants(6) };
    const a = generateKnockoutBracketPure(input);
    const b = generateKnockoutBracketPure(input);
    expect(a.fixtures.map((f) => f.generatorKey)).toEqual(b.fixtures.map((f) => f.generatorKey));
    expect(collectWinnerReferences(a.fixtures)).toEqual(collectWinnerReferences(b.fixtures));
  });
});

describe("01E3C — GROUP_RANK qualification entrants", () => {
  it("GROUP_PLUS_KNOCKOUT 4 qualification sources → SF + Final with correct references", () => {
    const entrants: KnockoutEntrantInput[] = [
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-1a" },
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-2b" },
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-1b" },
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-2a" },
    ];
    const { fixtures, diagnostics } = generateKnockoutBracketPure({
      stageKey: "KO",
      entrants,
    });
    expect(diagnostics.realFixtureCount).toBe(3);
    const round0 = fixtures.filter((f) => f.roundIndex === 0);
    expect(round0).toHaveLength(2);
    for (const fixture of round0) {
      expect(fixture.sides.sideA.type).toBe("QUALIFICATION_REFERENCE");
      expect(fixture.sides.sideB.type).toBe("QUALIFICATION_REFERENCE");
    }
    const finalRound = Math.max(...fixtures.map((f) => f.roundIndex));
    const final = fixtures.find((f) => f.roundIndex === finalRound)!;
    expect(final.sides.sideA.type).toBe("WINNER_OF_FIXTURE");
    expect(final.sides.sideB.type).toBe("WINNER_OF_FIXTURE");
    assertKnockoutDag(fixtures);
  });

  it("GROUP_RANK entrant with BYE propagates qualification reference structurally", () => {
    const entrants: KnockoutEntrantInput[] = [
      { kind: "QUALIFICATION_REFERENCE", qualificationSourceId: "qs-1a" },
      { kind: "CONCRETE_PARTICIPANT", participantId: "p-2" },
      { kind: "CONCRETE_PARTICIPANT", participantId: "p-3" },
    ];
    const { fixtures, diagnostics } = generateKnockoutBracketPure({
      stageKey: "KO",
      entrants,
    });
    expect(diagnostics.byeCount).toBe(1);
    const qualBye = diagnostics.byeAdvancements.find(
      (b) => b.entrant.kind === "QUALIFICATION_REFERENCE",
    );
    expect(qualBye?.entrant).toEqual({
      kind: "QUALIFICATION_REFERENCE",
      qualificationSourceId: "qs-1a",
    });
    const finalRound = Math.max(...fixtures.map((f) => f.roundIndex));
    const final = fixtures.find((f) => f.roundIndex === finalRound)!;
    const hasQualSide =
      final.sides.sideA.type === "QUALIFICATION_REFERENCE" ||
      final.sides.sideB.type === "QUALIFICATION_REFERENCE";
    expect(hasQualSide).toBe(true);
  });
});

describe("01E3C — performance observational", () => {
  it.each([
    [16, 15],
    [32, 31],
    [64, 63],
    [128, 127],
  ])("generates %i entrants (%i fixtures) within reasonable time", (n, expectedFixtures) => {
    const start = performance.now();
    const { fixtures, diagnostics } = generateKnockoutBracketPure({
      stageKey: "KO",
      entrants: participants(n),
    });
    const elapsedMs = performance.now() - start;
    expect(fixtures).toHaveLength(expectedFixtures);
    expect(diagnostics.bracketSize).toBe(smallestPowerOfTwoGte(n));
    expect(elapsedMs).toBeLessThan(500);
  });
});
