/**
 * Deterministic property-style Smart Mix invariant sweep.
 */

import { describe, expect, it } from "vitest";
import { generateSmartMixFixtures, planSmartMixTargetDegrees } from "../smart-mix";
import { validateSmartMixInvariants } from "../invariants";

describe("Smart Mix property sweep", () => {
  it("n=2..20 target=1..min(10,n+2) invariants", () => {
    for (let n = 2; n <= 20; n += 1) {
      const ids = Array.from({ length: n }, (_, i) => `prop-${n}-${i}`);
      const maxTarget = Math.min(10, n + 2);
      for (let target = 1; target <= maxTarget; target += 1) {
        const plan = planSmartMixTargetDegrees(ids, target);
        if (plan.expectedFixtureCount > 2000) continue;
        const fixtures = generateSmartMixFixtures({
          participantIds: ids,
          config: { targetMatchesPerParticipant: target },
        });
        validateSmartMixInvariants(ids, fixtures, { targetMatchesPerParticipant: target });
        const again = generateSmartMixFixtures({
          participantIds: ids,
          config: { targetMatchesPerParticipant: target },
        });
        expect(again).toEqual(fixtures);
      }
    }
  });
});
