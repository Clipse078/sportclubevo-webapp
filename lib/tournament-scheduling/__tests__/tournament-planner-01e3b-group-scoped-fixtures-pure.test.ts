/**
 * SCE-TOURNAMENT-PLANNER-01E3B — group-scoped RR + Smart Mix (pure).
 */

import { describe, expect, it } from "vitest";
import { planAutomaticGroupTopology } from "../group-formation";
import {
  buildRoundRobinGeneratorKey,
  buildSmartMixGeneratorKey,
  expectedRoundRobinFixtureCount,
  generateRoundRobinFixtures,
  generateSmartMixFixtures,
} from "../fixtures";
import { assertNoCrossGroupFixtures } from "../group-formation/group-fixture-pure";

function generateAllGroupFixtures(
  participantIds: readonly string[],
  groupCount: number,
  mode: "ROUND_ROBIN" | "SMART_MIX",
  options?: { meetingsPerOpponent?: number; target?: number },
) {
  const plan = planAutomaticGroupTopology(participantIds, groupCount);
  const groupParticipantSets = new Map<string, ReadonlySet<string>>();
  const allFixtures = [];
  for (let i = 0; i < plan.length; i += 1) {
    const group = plan[i]!;
    const groupScope = `group-${i}`;
    groupParticipantSets.set(groupScope, new Set(group.participantIds));
    const fixtures =
      mode === "ROUND_ROBIN"
        ? generateRoundRobinFixtures({
            participantIds: group.participantIds,
            config: {
              format: "ROUND_ROBIN",
              stageKey: "GROUP",
              generatorKeyGroupScope: groupScope,
              meetingsPerOpponent: options?.meetingsPerOpponent ?? 1,
            },
          })
        : generateSmartMixFixtures({
            participantIds: group.participantIds,
            config: {
              stageKey: "GROUP",
              generatorKeyGroupScope: groupScope,
              targetMatchesPerParticipant: options?.target ?? 2,
            },
          });
    allFixtures.push(...fixtures);
  }
  assertNoCrossGroupFixtures(allFixtures, groupParticipantSets);
  return { plan, allFixtures };
}

describe("01E3B — round robin per group", () => {
  it("8 / 2 groups ×1 yields correct per-group fixture counts", () => {
    const ids = Array.from({ length: 8 }, (_, i) => `rr8-${i}`);
    const { plan, allFixtures } = generateAllGroupFixtures(ids, 2, "ROUND_ROBIN");
    expect(plan.every((g) => g.participantIds.length === 4)).toBe(true);
    expect(allFixtures).toHaveLength(expectedRoundRobinFixtureCount(4) * 2);
    expect(new Set(allFixtures.map((f) => f.generatorKey)).size).toBe(allFixtures.length);
  });

  it("16 / 4 groups ×2 yields isolated generator keys", () => {
    const ids = Array.from({ length: 16 }, (_, i) => `rr16-${i}`);
    const { allFixtures } = generateAllGroupFixtures(ids, 4, "ROUND_ROBIN", {
      meetingsPerOpponent: 2,
    });
    expect(allFixtures).toHaveLength(expectedRoundRobinFixtureCount(4, 2) * 4);
    expect(new Set(allFixtures.map((f) => f.generatorKey)).size).toBe(allFixtures.length);
    expect(buildRoundRobinGeneratorKey("GROUP", 0, 0, 0, "g1")).toContain(":group:g1:");
  });
});

describe("01E3B — smart mix per group", () => {
  it("20 / 4 groups target 3 stays within group boundaries", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `sm20-${i}`);
    const { allFixtures } = generateAllGroupFixtures(ids, 4, "SMART_MIX", { target: 3 });
    expect(allFixtures.length).toBeGreaterThan(0);
    expect(buildSmartMixGeneratorKey("GROUP", 0, "g0")).toBe("smart-mix:GROUP:group:g0:0");
  });

  it("allows rematch in a small group when target requires it", () => {
    const fixtures = generateSmartMixFixtures({
      participantIds: ["a", "b", "c"],
      config: { stageKey: "G", generatorKeyGroupScope: "small", targetMatchesPerParticipant: 4 },
    });
    expect(fixtures.length).toBeGreaterThan(3);
  });
});

describe("01E3B — performance observational", () => {
  it("generates 64 / 8 Smart Mix group fixtures within reasonable time", () => {
    const ids = Array.from({ length: 64 }, (_, i) => `perf-sm-${i}`);
    const start = performance.now();
    const { allFixtures } = generateAllGroupFixtures(ids, 8, "SMART_MIX", { target: 3 });
    const elapsed = performance.now() - start;
    expect(allFixtures.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
  });
});

describe("01E3B — structural rounds are per-group", () => {
  it("two groups can both use roundIndex 0", () => {
    const ids = ["p1", "p2", "p3", "p4"];
    const { allFixtures } = generateAllGroupFixtures(ids, 2, "ROUND_ROBIN");
    const roundZero = allFixtures.filter((f) => f.roundIndex === 0);
    expect(roundZero.length).toBeGreaterThanOrEqual(2);
  });
});
