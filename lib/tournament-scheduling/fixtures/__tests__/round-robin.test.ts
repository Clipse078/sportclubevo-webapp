import { describe, it, expect } from "vitest";
import {
  generateRoundRobinFixtures,
  expectedRoundRobinFixtureCount,
  expectedRoundRobinRoundCount,
  validateRoundRobinInvariants,
  canonicalizeParticipantIds,
  ROUND_ROBIN_BYE_SENTINEL,
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

  it("rejects more than 16 participants", () => {
    expect(() => generateRoundRobinFixtures({ participantIds: ids(17) })).toThrow();
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
});

describe("side A/B policy", () => {
  it("assigns side A as lexicographically smaller participant id", () => {
    const fixtures = generateRoundRobinFixtures({ participantIds: ["team-z", "team-a", "team-m"] });
    for (const fixture of fixtures) {
      expect(fixture.sideAParticipantId.localeCompare(fixture.sideBParticipantId)).toBeLessThanOrEqual(0);
    }
  });

  it("avoids pathological always-A for one participant across all fixtures", () => {
    const fixtures = generateRoundRobinFixtures({ participantIds: ids(8) });
    const sideACounts = new Map<string, number>();
    for (const fixture of fixtures) {
      sideACounts.set(fixture.sideAParticipantId, (sideACounts.get(fixture.sideAParticipantId) ?? 0) + 1);
    }
    const counts = [...sideACounts.values()];
    expect(Math.max(...counts)).toBeLessThan(fixtures.length);
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
