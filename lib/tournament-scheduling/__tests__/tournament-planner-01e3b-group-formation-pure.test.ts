/**
 * SCE-TOURNAMENT-PLANNER-01E3B — pure group formation + labels.
 */

import { describe, expect, it } from "vitest";
import { formatTournamentGroupLabel } from "../competition-structure/display-labels";
import {
  computeBalancedGroupSizes,
  distributeParticipantsIntoBalancedGroups,
  GROUP_FORMATION_ALGORITHM,
  planAutomaticGroupTopology,
} from "../group-formation";

describe("01E3B — balanced group sizes", () => {
  const cases: Array<[number, number, number[]]> = [
    [2, 1, [2]],
    [3, 1, [3]],
    [4, 2, [2, 2]],
    [5, 2, [3, 2]],
    [6, 2, [3, 3]],
    [7, 2, [4, 3]],
    [8, 2, [4, 4]],
    [10, 3, [4, 3, 3]],
    [11, 3, [4, 4, 3]],
    [16, 4, [4, 4, 4, 4]],
    [17, 4, [5, 4, 4, 4]],
    [20, 4, [5, 5, 5, 5]],
    [32, 8, [4, 4, 4, 4, 4, 4, 4, 4]],
    [64, 8, [8, 8, 8, 8, 8, 8, 8, 8]],
  ];

  it.each(cases)("participants=%i groups=%i", (participants, groups, expected) => {
    const sizes = computeBalancedGroupSizes(participants, groups);
    expect(sizes).toEqual(expected);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });
});

describe("01E3B — determinism + distribution", () => {
  it("uses documented serpentine balanced-capacity algorithm", () => {
    expect(GROUP_FORMATION_ALGORITHM).toBe("SERPENTINE_BALANCED_CAPACITY");
  });

  it("is deterministic for the same participant set", () => {
    const ids = Array.from({ length: 16 }, (_, i) => `p-${String(i).padStart(2, "0")}`);
    const a = planAutomaticGroupTopology(ids, 4);
    const b = planAutomaticGroupTopology(ids, 4);
    expect(a).toEqual(b);
  });
});

describe("01E3B — group labels", () => {
  it("labels A through Z deterministically", () => {
    expect(formatTournamentGroupLabel(0)).toBe("Gruppe A");
    expect(formatTournamentGroupLabel(25)).toBe("Gruppe Z");
    expect(formatTournamentGroupLabel(26)).toBe("Gruppe AA");
  });

  it("assigns unique labels within a phase plan", () => {
    const ids = Array.from({ length: 30 }, (_, i) => `p${i}`);
    const plan = planAutomaticGroupTopology(ids, 6);
    const labels = plan.map((g) => g.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("01E3B — performance observational", () => {
  it("forms 64 / 8 groups quickly", () => {
    const ids = Array.from({ length: 64 }, (_, i) => `perf-${i}`);
    const start = performance.now();
    const { groupAssignments } = distributeParticipantsIntoBalancedGroups(ids, 8);
    const formationMs = performance.now() - start;
    expect(groupAssignments.length).toBe(8);
    expect(formationMs).toBeLessThan(500);
  });
});
