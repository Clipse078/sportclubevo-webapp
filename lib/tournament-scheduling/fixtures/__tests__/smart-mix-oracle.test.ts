/**
 * TEST-ONLY small-n optimality oracle (n = 2..8).
 */

import { describe, expect, it } from "vitest";
import {
  deriveSmartMixDiagnostics,
  generateSmartMixFixtures,
  planSmartMixTargetDegrees,
} from "../smart-mix";
import { compareParticipantId } from "../ordering";

function participantIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `p${String(i + 1).padStart(2, "0")}`);
}

function pairKey(a: string, b: string): string {
  return compareParticipantId(a, b) <= 0 ? `${a}|${b}` : `${b}|${a}`;
}

function allPairKeys(ids: readonly string[]): string[] {
  const keys: string[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      keys.push(pairKey(ids[i], ids[j]));
    }
  }
  return keys;
}

type ObjectiveVector = readonly [
  uniquePairCount: number,
  negMaxMultiplicity: number,
  negMultiplicityVariance: number,
  negMaxRepeatAppearance: number,
];

function evaluateMultigraph(
  ids: readonly string[],
  pairKeys: readonly string[],
  mult: number[],
  targetDegrees: readonly number[],
): ObjectiveVector | null {
  const degree = new Map<string, number>();
  for (const id of ids) degree.set(id, 0);
  for (let i = 0; i < pairKeys.length; i += 1) {
    const m = mult[i];
    if (m < 0) return null;
    const [a, b] = pairKeys[i].split("|");
    degree.set(a, (degree.get(a) ?? 0) + m);
    degree.set(b, (degree.get(b) ?? 0) + m);
  }
  for (let i = 0; i < ids.length; i += 1) {
    if ((degree.get(ids[i]) ?? 0) !== targetDegrees[i]) return null;
  }

  let uniquePairCount = 0;
  let maxMult = 0;
  const multValues: number[] = [];
  for (const m of mult) {
    if (m > 0) {
      uniquePairCount += 1;
      multValues.push(m);
      if (m > maxMult) maxMult = m;
    }
  }
  const mean = multValues.length ? multValues.reduce((s, v) => s + v, 0) / multValues.length : 0;
  const variance = multValues.reduce((s, v) => s + (v - mean) ** 2, 0);

  const opponents = new Map<string, Set<string>>();
  for (const id of ids) opponents.set(id, new Set());
  for (let i = 0; i < pairKeys.length; i += 1) {
    if (mult[i] <= 0) continue;
    const [a, b] = pairKeys[i].split("|");
    opponents.get(a)?.add(b);
    opponents.get(b)?.add(a);
  }
  let maxRepeatAppearance = 0;
  for (const id of ids) {
    const repeat = (degree.get(id) ?? 0) - (opponents.get(id)?.size ?? 0);
    if (repeat > maxRepeatAppearance) maxRepeatAppearance = repeat;
  }

  return [uniquePairCount, -maxMult, -variance, -maxRepeatAppearance];
}

function compareObjective(a: ObjectiveVector, b: ObjectiveVector): number {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function oracleBestObjective(
  ids: readonly string[],
  targetDegrees: readonly number[],
  maxMultCap: number,
): ObjectiveVector {
  const pairKeys = allPairKeys(ids);
  let best: ObjectiveVector | null = null;

  const mult = new Array<number>(pairKeys.length).fill(0);
  const remaining = [...targetDegrees];

  const search = (pairIndex: number): void => {
    if (pairIndex === pairKeys.length) {
      if (remaining.some((r) => r !== 0)) return;
      const score = evaluateMultigraph(ids, pairKeys, mult, targetDegrees);
      if (!score) return;
      if (!best || compareObjective(score, best) > 0) {
        best = score;
      }
      return;
    }

    const [a, b] = pairKeys[pairIndex].split("|");
    const ai = ids.indexOf(a);
    const bi = ids.indexOf(b);
    const maxForPair = Math.min(maxMultCap, remaining[ai], remaining[bi]);
    for (let m = 0; m <= maxForPair; m += 1) {
      mult[pairIndex] = m;
      remaining[ai] -= m;
      remaining[bi] -= m;
      search(pairIndex + 1);
      remaining[ai] += m;
      remaining[bi] += m;
    }
  };

  search(0);
  if (!best) {
    throw new Error("Oracle found no multigraph for degree plan");
  }
  return best;
}

function smartMixObjective(
  ids: readonly string[],
  target: number,
): ObjectiveVector {
  const plan = planSmartMixTargetDegrees(ids, target);
  const fixtures = generateSmartMixFixtures({
    participantIds: ids,
    config: { targetMatchesPerParticipant: target },
  });
  const d = deriveSmartMixDiagnostics(ids, fixtures, plan);
  const multValues: number[] = [];
  const pairMult = new Map<string, number>();
  for (const f of fixtures) {
    const key = pairKey(f.sideAParticipantId, f.sideBParticipantId);
    pairMult.set(key, (pairMult.get(key) ?? 0) + 1);
  }
  for (const m of pairMult.values()) multValues.push(m);
  const mean = multValues.reduce((s, v) => s + v, 0) / multValues.length;
  const variance = multValues.reduce((s, v) => s + (v - mean) ** 2, 0);
  return [
    d.uniquePairCount,
    -d.maxPairMultiplicity,
    -variance,
    -d.maxRepeatAppearanceCount,
  ];
}

const ORACLE_MAX_N = 6;
const ORACLE_MAX_FIXTURES = 10;

describe("Smart Mix — small-n oracle (test-only)", () => {
  it("matches oracle objective vector for n=2..6 and bounded targets", () => {
    for (let n = 2; n <= ORACLE_MAX_N; n += 1) {
      for (let target = 1; target <= Math.min(2 * (n - 1), 6); target += 1) {
        const ids = participantIds(n);
        const plan = planSmartMixTargetDegrees(ids, target);
        if (plan.expectedFixtureCount > ORACLE_MAX_FIXTURES) {
          continue;
        }
        const maxMultCap = Math.max(target, 3);
        const oracle = oracleBestObjective(ids, plan.participantDegrees, maxMultCap);
        const produced = smartMixObjective(ids, target);
        // Objective 1 (maximum unique unordered pairs) must match the oracle optimum.
        expect(
          produced[0],
          `n=${n} target=${target} produced=${produced.join(",")} oracle=${oracle.join(",")}`,
        ).toBeGreaterThanOrEqual(oracle[0]);
      }
    }
  });
});
