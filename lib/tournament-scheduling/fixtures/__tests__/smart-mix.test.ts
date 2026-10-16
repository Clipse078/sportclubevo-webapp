/**
 * SCE-TOURNAMENT-PLANNER-01E2 — Smart Mix pure generator matrix.
 */

import { describe, expect, it } from "vitest";
import {
  buildSmartMixGeneratorKey,
  deriveSmartMixDiagnostics,
  generateSmartMixFixtures,
  planSmartMixTargetDegrees,
} from "../smart-mix";
import { generateTournamentFixtures } from "../generate-tournament-fixtures";
import { validateSmartMixInvariants } from "../invariants";
import { compareParticipantId } from "../ordering";

function participantIds(count: number, prefix = "p"): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);
}

function pairMultiplicityMap(
  fixtures: ReturnType<typeof generateSmartMixFixtures>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of fixtures) {
    const a = f.sideAParticipantId;
    const b = f.sideBParticipantId;
    const key =
      compareParticipantId(a, b) <= 0 ? `${a}|${b}` : `${b}|${a}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

const MATRIX: Array<[number, number]> = [
  [2, 1],
  [2, 2],
  [2, 3],
  [3, 1],
  [3, 2],
  [3, 4],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 5],
  [5, 2],
  [5, 3],
  [5, 4],
  [5, 6],
  [6, 3],
  [8, 3],
  [10, 4],
  [12, 5],
  [16, 5],
];

describe("Smart Mix — primary test matrix", () => {
  it.each(MATRIX)("N=%i target=%i invariants", (n, target) => {
    const ids = participantIds(n);
    const plan = planSmartMixTargetDegrees(ids, target);
    const fixtures = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: target },
    });
    const classification = validateSmartMixInvariants(ids, fixtures, {
      targetMatchesPerParticipant: target,
    });
    expect(classification).toBe(plan.balanceClassification);

    const again = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: target },
    });
    expect(again).toEqual(fixtures);

    for (let i = 0; i < fixtures.length; i += 1) {
      expect(fixtures[i].generatorKey).toBe(buildSmartMixGeneratorKey("MAIN", i));
    }
  });
});

describe("Smart Mix — exact balance cases", () => {
  it.each([
    [4, 3],
    [6, 3],
    [8, 3],
    [10, 4],
    [12, 5],
  ] as const)("n=%i k=%i EXACT", (n, k) => {
    const ids = participantIds(n);
    const classification = validateSmartMixInvariants(
      ids,
      generateSmartMixFixtures({ participantIds: ids, config: { targetMatchesPerParticipant: k } }),
      { targetMatchesPerParticipant: k },
    );
    expect(classification).toBe("EXACT");
  });
});

describe("Smart Mix — parity cases", () => {
  it.each([
    [3, 1],
    [5, 1],
    [5, 3],
    [7, 3],
  ] as const)("n=%i k=%i NEAR_BALANCED_PARITY", (n, k) => {
    const ids = participantIds(n);
    const plan = planSmartMixTargetDegrees(ids, k);
    expect(plan.balanceClassification).toBe("NEAR_BALANCED_PARITY");
    expect(plan.reducedMatchParticipantIds).toEqual([ids[0]]);
    const fixtures = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: k },
    });
    validateSmartMixInvariants(ids, fixtures, { targetMatchesPerParticipant: k });
    expect(plan.expectedFixtureCount).toBe(
      (n * k - 1) / 2,
    );
  });
});

describe("Smart Mix — no unnecessary rematches", () => {
  it.each([
    [6, 3],
    [8, 3],
    [10, 4],
    [12, 5],
  ] as const)("n=%i k=%i unique opponents only", (n, k) => {
    const ids = participantIds(n);
    const fixtures = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: k },
    });
    const mult = pairMultiplicityMap(fixtures);
    for (const count of mult.values()) {
      expect(count).toBe(1);
    }
  });
});

describe("Smart Mix — unavoidable rematches", () => {
  it.each([
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
  ] as const)("n=%i k=%i requires repeats", (n, k) => {
    const ids = participantIds(n);
    const fixtures = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: k },
    });
    validateSmartMixInvariants(ids, fixtures, { targetMatchesPerParticipant: k });
    const d = deriveSmartMixDiagnostics(
      ids,
      fixtures,
      planSmartMixTargetDegrees(ids, k),
    );
    expect(d.repeatedPairCount).toBeGreaterThan(0);
    expect(d.maxPairMultiplicity).toBeGreaterThan(1);
  });
});

describe("Smart Mix — duplicate source team identity", () => {
  it("does not deduplicate same team twice", () => {
    const ids = ["team-a-rot", "team-a-blau", "team-c"];
    const fixtures = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: 2 },
    });
    validateSmartMixInvariants(ids, fixtures, { targetMatchesPerParticipant: 2 });
    const keys = new Set(
      fixtures.map((f) =>
        [f.sideAParticipantId, f.sideBParticipantId].sort(compareParticipantId).join("|"),
      ),
    );
    expect(keys.has("team-a-blau|team-a-rot")).toBe(true);
  });
});

describe("Smart Mix — Home/Away relevance", () => {
  it("OFF keeps neutral ordering independent of rematch quality", () => {
    const ids = participantIds(4);
    const off = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: 2, homeAwayRelevance: "OFF" },
    });
    const on = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: 2, homeAwayRelevance: "ON" },
    });
    const offPairs = off.map((f) =>
      [f.sideAParticipantId, f.sideBParticipantId].sort(compareParticipantId).join("|"),
    );
    const onPairs = on.map((f) =>
      [f.sideAParticipantId, f.sideBParticipantId].sort(compareParticipantId).join("|"),
    );
    expect(offPairs.sort()).toEqual(onPairs.sort());

    for (const f of off) {
      expect(
        compareParticipantId(f.sideAParticipantId, f.sideBParticipantId) <= 0,
      ).toBe(true);
    }
  });

  it("ON balances home/away within ±1 for n=5 k=3 parity", () => {
    const ids = participantIds(5);
    const fixtures = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: 3, homeAwayRelevance: "ON" },
    });
    const home = new Map<string, number>();
    const away = new Map<string, number>();
    for (const id of ids) {
      home.set(id, 0);
      away.set(id, 0);
    }
    for (const f of fixtures) {
      home.set(f.sideAParticipantId, (home.get(f.sideAParticipantId) ?? 0) + 1);
      away.set(f.sideBParticipantId, (away.get(f.sideBParticipantId) ?? 0) + 1);
    }
    for (const id of ids) {
      expect(Math.abs((home.get(id) ?? 0) - (away.get(id) ?? 0))).toBeLessThanOrEqual(1);
    }
  });
});

describe("Smart Mix — performance smoke (observational)", () => {
  const cases: Array<[number, number]> = [
    [16, 5],
    [20, 5],
    [32, 5],
    [32, 10],
    [32, 31],
  ];

  it.each(cases)("n=%i target=%i completes within budget", (n, target) => {
    const ids = participantIds(n);
    const started = performance.now();
    const fixtures = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: target },
    });
    const elapsedMs = performance.now() - started;
    validateSmartMixInvariants(ids, fixtures, { targetMatchesPerParticipant: target });
    expect(elapsedMs).toBeLessThan(5000);
    // eslint-disable-next-line no-console -- observational timing for 01E2 closure report
    console.info(`[smart-mix perf] n=${n} target=${target} ms=${elapsedMs.toFixed(1)} fixtures=${fixtures.length}`);
  });
});

describe("Smart Mix — canonical entry point", () => {
  it("routes SMART_MIX via generateTournamentFixtures", () => {
    const ids = participantIds(4);
    const direct = generateSmartMixFixtures({
      participantIds: ids,
      config: { targetMatchesPerParticipant: 2 },
    });
    const routed = generateTournamentFixtures({
      strategy: "SMART_MIX",
      participantIds: ids,
      smartMix: { targetMatchesPerParticipant: 2 },
    });
    expect(routed).toEqual(direct);
  });
});
