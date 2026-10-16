/**
 * SCE-TOURNAMENT-PLANNER-01E2-R1 — exhaustive Smart Mix invariants (n = 2..20).
 */

import { describe, expect, it } from "vitest";
import {
  generateSmartMixFixtures,
  isGraphicDegreeSequence,
  planSmartMixTargetDegrees,
} from "../smart-mix";
import { validateSmartMixInvariants } from "../invariants";
import { compareParticipantId } from "../ordering";

function participantIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `p${String(i + 1).padStart(2, "0")}`);
}

function repeatedPairCount(
  fixtures: ReturnType<typeof generateSmartMixFixtures>,
): number {
  const map = new Map<string, number>();
  for (const f of fixtures) {
    const key =
      compareParticipantId(f.sideAParticipantId, f.sideBParticipantId) <= 0
        ? `${f.sideAParticipantId}|${f.sideBParticipantId}`
        : `${f.sideBParticipantId}|${f.sideAParticipantId}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  let repeats = 0;
  for (const mult of map.values()) {
    if (mult > 1) repeats += 1;
  }
  return repeats;
}

const MAX_N = 20;
const TARGET_CAP = (n: number) => Math.min(2 * (n - 1), 38);

describe("Smart Mix — exhaustive invariants n=2..20", () => {
  it("all n × target combinations satisfy invariants", () => {
    for (let n = 2; n <= MAX_N; n += 1) {
      for (let target = 1; target <= TARGET_CAP(n); target += 1) {
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

        const replay = generateSmartMixFixtures({
          participantIds: ids,
          config: { targetMatchesPerParticipant: target },
        });
        expect(replay).toEqual(fixtures);

        const keys = new Set(fixtures.map((f) => f.generatorKey));
        expect(keys.size).toBe(fixtures.length);

        const maxDegree = Math.max(...plan.participantDegrees);
        const simpleFeasible =
          maxDegree <= n - 1 && isGraphicDegreeSequence(plan.participantDegrees);
        if (simpleFeasible) {
          expect(repeatedPairCount(fixtures)).toBe(0);
        }

        if (n * target % 2 === 0) {
          expect(plan.balanceClassification).toBe("EXACT");
        } else {
          expect(plan.balanceClassification).toBe("NEAR_BALANCED_PARITY");
          expect(plan.reducedMatchParticipantIds).toEqual([ids[0]]);
        }
      }
    }
  });
});

describe("Smart Mix — parity degree plan graphicality", () => {
  it("canonical parity plan is graphical for 1 <= k <= n-1 when n×k is odd", () => {
    for (let n = 2; n <= MAX_N; n += 1) {
      for (let k = 1; k <= n - 1; k += 1) {
        if ((n * k) % 2 === 0) continue;
        const ids = participantIds(n);
        const plan = planSmartMixTargetDegrees(ids, k);
        expect(plan.balanceClassification).toBe("NEAR_BALANCED_PARITY");
        expect(isGraphicDegreeSequence(plan.participantDegrees)).toBe(true);
      }
    }
  });
});
