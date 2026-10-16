/**
 * Observational Smart Mix generation timings (no hard gate).
 */

import { describe, expect, it } from "vitest";
import { generateSmartMixFixtures } from "../smart-mix";

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `perf-${i}`);
}

describe("Smart Mix performance (observational)", () => {
  const cases: Array<[number, number]> = [
    [16, 5],
    [20, 5],
    [32, 5],
    [32, 10],
    [4, 20],
  ];

  it.each(cases)("n=%i target=%i completes quickly", (n, target) => {
    const start = performance.now();
    const fixtures = generateSmartMixFixtures({
      participantIds: ids(n),
      config: { targetMatchesPerParticipant: target },
    });
    const elapsed = performance.now() - start;
    expect(fixtures.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
    // eslint-disable-next-line no-console -- observational timing for package report
    console.info(`[smart-mix-perf] n=${n} target=${target} fixtures=${fixtures.length} ms=${elapsed.toFixed(1)}`);
  });
});
