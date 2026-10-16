/**
 * SCE-TOURNAMENT-PLANNER-01E3D — qualification mapping pure tests.
 */

import { describe, expect, it } from "vitest";
import { generateKnockoutBracketPure } from "../knockout-bracket/knockout-bracket-pure";
import {
  buildKnockoutEntrantOrderFromMappingsPure,
  firstRoundPairGroups,
  generateDefaultGroupRankMappingsPure,
  mappingFingerprint,
  QualificationMappingValidationError,
  seedIndexToStructuralTarget,
  structuralTargetToSeedIndex,
  validateGroupRankMappingsPure,
} from "../qualification-mapping/qualification-mapping-pure";
import type { GroupRankToKnockoutEntryMapping } from "../qualification-mapping/qualification-mapping-types";

function groups(count: number): { id: string; displayOrder: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `group-${String.fromCharCode(65 + i)}`,
    displayOrder: i + 1,
  }));
}

function qualIds(mappings: GroupRankToKnockoutEntryMapping[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of mappings) {
    map.set(`${m.source.sourceGroupId}:${m.source.rank}`, `qs-${m.source.sourceGroupId}-r${m.source.rank}`);
  }
  return map;
}

describe("01E3D — canonical 2×2 default mapping", () => {
  it("maps 1A vs 2B and 1B vs 2A structurally", () => {
    const { mappings, entrantCount } = generateDefaultGroupRankMappingsPure({
      groups: groups(2),
      qualifiersPerGroup: 2,
    });
    expect(entrantCount).toBe(4);
    const pairs = firstRoundPairGroups(mappings);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]?.sourceGroupIds).toEqual(["group-A", "group-B"]);
    expect(pairs[1]?.sourceGroupIds).toEqual(["group-B", "group-A"]);
    const ranksBySlot = mappings.map((m) => m.source.rank);
    expect(ranksBySlot.sort()).toEqual([1, 1, 2, 2]);
  });
});

describe("01E3D — default mapping matrix", () => {
  it("4 groups × 2 qualifiers → 8 entrants with cross-group first round", () => {
    const { mappings } = generateDefaultGroupRankMappingsPure({
      groups: groups(4),
      qualifiersPerGroup: 2,
    });
    const pairs = firstRoundPairGroups(mappings);
    for (const pair of pairs) {
      if (pair.sourceGroupIds.length === 2) {
        expect(pair.sourceGroupIds[0]).not.toBe(pair.sourceGroupIds[1]);
      }
    }
    expect(mappings).toHaveLength(8);
  });

  it("8 groups × 2 qualifiers → 16 entrants deterministically", () => {
    const input = { groups: groups(8), qualifiersPerGroup: 2 };
    const a = generateDefaultGroupRankMappingsPure(input);
    const b = generateDefaultGroupRankMappingsPure(input);
    expect(mappingFingerprint(a.mappings)).toBe(mappingFingerprint(b.mappings));
    expect(a.mappings).toHaveLength(16);
  });

  it("2 groups × 4 qualifiers → 8 entrants", () => {
    const { mappings } = generateDefaultGroupRankMappingsPure({
      groups: groups(2),
      qualifiersPerGroup: 4,
    });
    expect(mappings).toHaveLength(8);
    const pairs = firstRoundPairGroups(mappings);
    const sameGroupPairs = pairs.filter(
      (p) => p.sourceGroupIds.length === 2 && p.sourceGroupIds[0] === p.sourceGroupIds[1],
    );
    expect(sameGroupPairs).toHaveLength(0);
  });

  it("3 groups × 2 qualifiers → 6 entrants (BYE bracket)", () => {
    const { mappings, entrantCount, bracketSize } = generateDefaultGroupRankMappingsPure({
      groups: groups(3),
      qualifiersPerGroup: 2,
    });
    expect(entrantCount).toBe(6);
    expect(bracketSize).toBe(8);
    expect(mappings).toHaveLength(6);
  });
});

describe("01E3D — explicit mapping preserved", () => {
  it("preserves caller bracket entry structure exactly", () => {
    const explicit: GroupRankToKnockoutEntryMapping[] = [
      { source: { sourceGroupId: "group-A", rank: 1 }, target: { roundIndex: 0, slotIndexInRound: 0, side: "A" } },
      { source: { sourceGroupId: "group-C", rank: 2 }, target: { roundIndex: 0, slotIndexInRound: 0, side: "B" } },
      { source: { sourceGroupId: "group-B", rank: 1 }, target: { roundIndex: 0, slotIndexInRound: 1, side: "A" } },
      { source: { sourceGroupId: "group-D", rank: 2 }, target: { roundIndex: 0, slotIndexInRound: 1, side: "B" } },
    ];
    validateGroupRankMappingsPure({
      mappings: explicit,
      entrantCount: 4,
      groupParticipantCountById: new Map([
        ["group-A", 3],
        ["group-B", 3],
        ["group-C", 3],
        ["group-D", 3],
      ]),
    });
    const { entrants } = buildKnockoutEntrantOrderFromMappingsPure({
      entrantCount: 4,
      mappings: explicit,
      qualificationSourceIdByGroupRank: qualIds(explicit),
    });
    const bracket = generateKnockoutBracketPure({ stageKey: "KO", entrants });
    const r0 = bracket.fixtures.filter((f) => f.roundIndex === 0);
    expect(r0[0]?.sides.sideA).toEqual({
      type: "QUALIFICATION_REFERENCE",
      qualificationSourceId: "qs-group-A-r1",
    });
    expect(r0[0]?.sides.sideB).toEqual({
      type: "QUALIFICATION_REFERENCE",
      qualificationSourceId: "qs-group-C-r2",
    });
  });
});

describe("01E3D — invalid mappings rejected", () => {
  it("rejects duplicate GROUP_RANK source", () => {
    const mappings: GroupRankToKnockoutEntryMapping[] = [
      { source: { sourceGroupId: "group-A", rank: 1 }, target: { roundIndex: 0, slotIndexInRound: 0, side: "A" } },
      { source: { sourceGroupId: "group-A", rank: 1 }, target: { roundIndex: 0, slotIndexInRound: 1, side: "A" } },
      { source: { sourceGroupId: "group-B", rank: 1 }, target: { roundIndex: 0, slotIndexInRound: 0, side: "B" } },
      { source: { sourceGroupId: "group-B", rank: 2 }, target: { roundIndex: 0, slotIndexInRound: 1, side: "B" } },
    ];
    expect(() =>
      validateGroupRankMappingsPure({
        mappings,
        entrantCount: 4,
        groupParticipantCountById: new Map([
          ["group-A", 3],
          ["group-B", 3],
        ]),
      }),
    ).toThrow(QualificationMappingValidationError);
  });

  it("rejects rank 0 and impossible rank", () => {
    expect(() =>
      validateGroupRankMappingsPure({
        mappings: [
          { source: { sourceGroupId: "group-A", rank: 0 }, target: { roundIndex: 0, slotIndexInRound: 0, side: "A" } },
        ],
        entrantCount: 1,
        groupParticipantCountById: new Map([["group-A", 3]]),
      }),
    ).toThrow(/rank must be >= 1/);

    expect(() =>
      validateGroupRankMappingsPure({
        mappings: [
          { source: { sourceGroupId: "group-A", rank: 4 }, target: { roundIndex: 0, slotIndexInRound: 0, side: "A" } },
        ],
        entrantCount: 1,
        groupParticipantCountById: new Map([["group-A", 3]]),
      }),
    ).toThrow(/exceeds group participant count/);
  });
});

describe("01E3D — BYE integration via entrant order", () => {
  it("preserves GROUP_RANK qualification reference through BYE advancement", () => {
    const { mappings } = generateDefaultGroupRankMappingsPure({
      groups: groups(3),
      qualifiersPerGroup: 2,
    });
    const { entrants } = buildKnockoutEntrantOrderFromMappingsPure({
      entrantCount: mappings.length,
      mappings,
      qualificationSourceIdByGroupRank: qualIds(mappings),
    });
    const { diagnostics } = generateKnockoutBracketPure({ stageKey: "KO", entrants });
    expect(diagnostics.byeCount).toBeGreaterThan(0);
    const qualBye = diagnostics.byeAdvancements.find((b) => b.entrant.kind === "QUALIFICATION_REFERENCE");
    expect(qualBye).toBeDefined();
  });
});

describe("01E3D — seed ↔ structural roundtrip", () => {
  it("maps seeds to round-0 sides and back", () => {
    const bracketSize = 8;
    for (let seed = 1; seed <= 8; seed++) {
      const target = seedIndexToStructuralTarget(bracketSize, seed);
      expect(structuralTargetToSeedIndex(bracketSize, target)).toBe(seed);
    }
  });
});

describe("01E3D — performance observational", () => {
  it.each([16, 32, 64, 128])("%i knockout entrants", (entrantCount) => {
    const groupCount = entrantCount / 2;
    const start = performance.now();
    const { mappings } = generateDefaultGroupRankMappingsPure({
      groups: groups(groupCount),
      qualifiersPerGroup: 2,
    });
    const elapsedMs = performance.now() - start;
    expect(mappings).toHaveLength(entrantCount);
    expect(elapsedMs).toBeLessThan(500);
  });
});
