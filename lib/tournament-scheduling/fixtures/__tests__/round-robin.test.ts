import { describe, it, expect } from "vitest";
import {
  generateRoundRobinFixtures,
  expectedRoundRobinFixtureCount,
  expectedRoundRobinRoundCount,
  validateRoundRobinInvariants,
  canonicalizeParticipantIds,
  compareParticipantId,
  ROUND_ROBIN_BYE_SENTINEL,
  buildRoundRobinGeneratorKey,
  generateTournamentFixtures,
} from "../index";

function ids(count: number, prefix = "p"): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);
}

function participantsFromIds(participantIds: string[]) {
  return participantIds.map((id, index) => ({ id, displayOrder: index }));
}

describe("generateRoundRobinFixtures — matrix", () => {
  const sizes = [2, 3, 4, 5, 6, 8, 16] as const;

  for (const n of sizes) {
    it(`generates valid fixtures for n=${n}`, () => {
      const participantIds = ids(n);
      const fixtures = generateRoundRobinFixtures({ participantIds });
      expect(fixtures).toHaveLength(expectedRoundRobinFixtureCount(n));
      validateRoundRobinInvariants(participantIds, fixtures);
      expect(fixtures.every((f) => f.stageKey === "MAIN")).toBe(true);
      expect(fixtures.every((f) => !f.sideAParticipantId.includes("BYE"))).toBe(true);
      expect(
        fixtures.every(
          (f) =>
            f.sideAParticipantId !== ROUND_ROBIN_BYE_SENTINEL &&
            f.sideBParticipantId !== ROUND_ROBIN_BYE_SENTINEL,
        ),
      ).toBe(true);

      const maxRound = Math.max(...fixtures.map((f) => f.roundIndex));
      expect(maxRound + 1).toBe(expectedRoundRobinRoundCount(n));

      if (n === 16) {
        expect(fixtures).toHaveLength(120);
        expect(expectedRoundRobinRoundCount(16)).toBe(15);
        const roundZero = fixtures.filter((f) => f.roundIndex === 0);
        expect(roundZero).toHaveLength(8);
      }
    });
  }

  it("is deterministic on repeat", () => {
    const participantIds = ids(6);
    const first = generateRoundRobinFixtures({ participantIds });
    const second = generateRoundRobinFixtures({ participantIds });
    expect(second).toEqual(first);
  });

  it("rejects insufficient participants", () => {
    expect(() => generateRoundRobinFixtures({ participantIds: ids(1) })).toThrow();
  });

  it("supports more than 16 participants within technical fixture limit", () => {
    const participantIds = ids(20);
    const fixtures = generateRoundRobinFixtures({ participantIds });
    expect(fixtures).toHaveLength(expectedRoundRobinFixtureCount(20));
    validateRoundRobinInvariants(participantIds, fixtures);
  });

  it("rejects duplicate participant ids", () => {
    expect(() =>
      generateRoundRobinFixtures({ participantIds: ["a", "a", "b"] }),
    ).toThrow();
  });
});

describe("odd participant bye handling", () => {
  for (const n of [3, 5] as const) {
    it(`one bye per round and per participant for n=${n}`, () => {
      const participantIds = ids(n);
      const fixtures = generateRoundRobinFixtures({ participantIds });
      validateRoundRobinInvariants(participantIds, fixtures);

      const rounds = expectedRoundRobinRoundCount(n);
      for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
        const roundFixtures = fixtures.filter((f) => f.roundIndex === roundIndex);
        const playing = new Set<string>();
        for (const fixture of roundFixtures) {
          playing.add(fixture.sideAParticipantId);
          playing.add(fixture.sideBParticipantId);
        }
        expect(playing.size).toBe(n - 1);
      }
    });
  }
});

describe("canonical participant ordering", () => {
  it("normalizes retrieval order via displayOrder then id", () => {
    const shuffled = [
      { id: "p03", displayOrder: 2 },
      { id: "p01", displayOrder: 0 },
      { id: "p02", displayOrder: 1 },
    ];
    expect(canonicalizeParticipantIds(shuffled)).toEqual(["p01", "p02", "p03"]);

    const fromShuffled = generateRoundRobinFixtures({
      participantIds: canonicalizeParticipantIds(shuffled),
    });
    const fromCanonical = generateRoundRobinFixtures({
      participantIds: ["p01", "p02", "p03"],
    });
    expect(fromShuffled).toEqual(fromCanonical);
  });

  it("uses id tie-break when displayOrder matches", () => {
    const rows = [
      { id: "b-id", displayOrder: 0 },
      { id: "a-id", displayOrder: 0 },
    ];
    expect(canonicalizeParticipantIds(rows)).toEqual(["a-id", "b-id"]);
  });

  it("uses UTF-16 code-unit id order (not locale-sensitive collation)", () => {
    const rows = [
      { id: "z-participant", displayOrder: 0 },
      { id: "ä-participant", displayOrder: 0 },
    ];
    expect(canonicalizeParticipantIds(rows)).toEqual(["z-participant", "ä-participant"]);
    expect(compareParticipantId("z-participant", "ä-participant")).toBeLessThan(0);
  });
});

describe("side A/B policy", () => {
  it("assigns side A as code-unit-smaller participant id", () => {
    const fixtures = generateRoundRobinFixtures({ participantIds: ["team-z", "team-a", "team-m"] });
    for (const fixture of fixtures) {
      expect(compareParticipantId(fixture.sideAParticipantId, fixture.sideBParticipantId)).toBeLessThanOrEqual(
        0,
      );
    }
  });

  it("lexical side A is neutral — smallest seed id may be side A in every one of its fixtures", () => {
    const participantIds = ids(8);
    const fixtures = generateRoundRobinFixtures({ participantIds });
    const smallest = participantIds[0];
    const smallestFixtures = fixtures.filter(
      (f) => f.sideAParticipantId === smallest || f.sideBParticipantId === smallest,
    );
    expect(smallestFixtures.every((f) => f.sideAParticipantId === smallest)).toBe(true);
  });
});

describe("property-style sizes 2..16", () => {
  for (let n = 2; n <= 16; n += 1) {
    it(`invariants hold for n=${n}`, () => {
      const participantIds = ids(n);
      const fixtures = generateRoundRobinFixtures({ participantIds });
      validateRoundRobinInvariants(participantIds, fixtures);
    });
  }
});

describe("ordering independence via canonicalize", () => {
  it("same set different input order yields same fixtures after canonicalize", () => {
    const base = participantsFromIds(["c", "a", "b"]);
    const permuted = [base[1], base[2], base[0]];
    const a = generateRoundRobinFixtures({
      participantIds: canonicalizeParticipantIds(base),
    });
    const b = generateRoundRobinFixtures({
      participantIds: canonicalizeParticipantIds(permuted),
    });
    expect(a).toEqual(b);
  });
});

describe("repeated round robin — product matrix", () => {
  const cases = [
    { n: 2, m: 1 },
    { n: 2, m: 2 },
    { n: 3, m: 1 },
    { n: 3, m: 2 },
    { n: 4, m: 1 },
    { n: 4, m: 2 },
    { n: 5, m: 3 },
    { n: 6, m: 4 },
  ] as const;

  for (const { n, m } of cases) {
    it(`n=${n} meetings=${m}`, () => {
      const participantIds = ids(n);
      const fixtures = generateRoundRobinFixtures({
        participantIds,
        config: { format: "ROUND_ROBIN", meetingsPerOpponent: m },
      });
      expect(fixtures).toHaveLength(expectedRoundRobinFixtureCount(n, m));
      validateRoundRobinInvariants(participantIds, fixtures, { meetingsPerOpponent: m });
      expect(new Set(fixtures.map((f) => f.generatorKey)).size).toBe(fixtures.length);
      for (const fixture of fixtures) {
        expect(fixture.generatorKey).toMatch(/^round-robin:MAIN:\d+:\d+:\d+$/);
      }
    });
  }

  it("is deterministic on repeat for 6×4", () => {
    const participantIds = ids(6);
    const config = { format: "ROUND_ROBIN" as const, meetingsPerOpponent: 4 };
    const first = generateRoundRobinFixtures({ participantIds, config });
    const second = generateRoundRobinFixtures({ participantIds, config });
    expect(second).toEqual(first);
  });
});

describe("generator foundation dispatch", () => {
  it("rejects SMART_MIX explicitly", () => {
    expect(() =>
      generateTournamentFixtures({
        strategy: "SMART_MIX",
        participantIds: ids(3),
      }),
    ).toThrow(/SMART_MIX/);
  });
});

describe("duplicate source team participants", () => {
  it("generates a pairing between two rows with the same teamId", () => {
    const rot = "participant-rot-id";
    const blau = "participant-blau-id";
    const fixtures = generateRoundRobinFixtures({
      participantIds: [rot, blau, "p-away"],
      config: { format: "ROUND_ROBIN" },
    });
    const headToHead = fixtures.filter(
      (f) =>
        (f.sideAParticipantId === rot && f.sideBParticipantId === blau) ||
        (f.sideAParticipantId === blau && f.sideBParticipantId === rot),
    );
    expect(headToHead).toHaveLength(1);
  });
});

function homeSideCount(
  fixtures: ReturnType<typeof generateRoundRobinFixtures>,
  participantId: string,
): number {
  return fixtures.filter((f) => f.sideAParticipantId === participantId).length;
}

describe("fixture Home/Away relevance", () => {
  it("OFF keeps neutral side A as code-unit-smaller id", () => {
    const fixtures = generateRoundRobinFixtures({
      participantIds: ["team-z", "team-a"],
      config: { format: "ROUND_ROBIN", meetingsPerOpponent: 2, homeAwayRelevance: "OFF" },
    });
    for (const fixture of fixtures) {
      expect(compareParticipantId(fixture.sideAParticipantId, fixture.sideBParticipantId)).toBeLessThanOrEqual(
        0,
      );
    }
  });

  it("ON reverses sides on the second cycle for a pair", () => {
    const a = "team-a";
    const b = "team-b";
    const fixtures = generateRoundRobinFixtures({
      participantIds: [a, b],
      config: { format: "ROUND_ROBIN", meetingsPerOpponent: 2, homeAwayRelevance: "ON" },
    });
    const meetings = fixtures.filter(
      (f) =>
        (f.sideAParticipantId === a && f.sideBParticipantId === b) ||
        (f.sideAParticipantId === b && f.sideBParticipantId === a),
    );
    expect(meetings).toHaveLength(2);
    expect(meetings[0].sideAParticipantId).toBe(a);
    expect(meetings[1].sideAParticipantId).toBe(b);
  });

  for (const m of [1, 2, 3, 4] as const) {
    it(`ON home/away balance for 4 participants × ${m} meetings`, () => {
      const participantIds = ids(4);
      const fixtures = generateRoundRobinFixtures({
        participantIds,
        config: { format: "ROUND_ROBIN", meetingsPerOpponent: m, homeAwayRelevance: "ON" },
      });
      for (let i = 0; i < participantIds.length; i += 1) {
        for (let j = i + 1; j < participantIds.length; j += 1) {
          const p = participantIds[i];
          const q = participantIds[j];
          const pairFixtures = fixtures.filter(
            (f) =>
              (f.sideAParticipantId === p && f.sideBParticipantId === q) ||
              (f.sideAParticipantId === q && f.sideBParticipantId === p),
          );
          expect(pairFixtures).toHaveLength(m);
          const pHome = pairFixtures.filter((f) => f.sideAParticipantId === p).length;
          const qHome = pairFixtures.filter((f) => f.sideAParticipantId === q).length;
          expect(Math.abs(pHome - qHome)).toBeLessThanOrEqual(1);
        }
      }
    });
  }

  it("documents generator key grammar", () => {
    expect(buildRoundRobinGeneratorKey("MAIN", 2, 3, 1)).toBe("round-robin:MAIN:2:3:1");
  });
});

describe("technical fixture limit", () => {
  it("rejects excessive fixture counts", () => {
    expect(() =>
      generateRoundRobinFixtures({
        participantIds: ids(100),
        config: { format: "ROUND_ROBIN", meetingsPerOpponent: 10 },
      }),
    ).toThrow(/technical limit/i);
  });
});
