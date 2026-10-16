/**
 * Observational pure-generation timings (non-flaky thresholds).
 */

import { describe, expect, it } from "vitest";
import { generateRoundRobinFixtures } from "../round-robin";

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p-${String(i).padStart(3, "0")}`);
}

describe("round robin pure generation performance", () => {
  it("generates 16/20/32 participant sets within generous budget", () => {
    for (const n of [16, 20, 32]) {
      const start = performance.now();
      const fixtures = generateRoundRobinFixtures({ participantIds: ids(n) });
      const elapsedMs = performance.now() - start;
      expect(fixtures.length).toBe((n * (n - 1)) / 2);
      expect(elapsedMs).toBeLessThan(500);
    }
  });

  it("generates 16×4 repeated round robin within generous budget", () => {
    const start = performance.now();
    const fixtures = generateRoundRobinFixtures({
      participantIds: ids(16),
      config: { format: "ROUND_ROBIN", meetingsPerOpponent: 4 },
    });
    const elapsedMs = performance.now() - start;
    expect(fixtures).toHaveLength(480);
    expect(elapsedMs).toBeLessThan(500);
  });
});
