import { describe, expect, it } from "vitest";
import { summarizeLatency } from "@/lib/diagnostics/sce-perf-stats";

describe("sce-perf-stats", () => {
  it("summarizes ordered samples", () => {
    const summary = summarizeLatency("test", [10, 20, 30, 40, 50]);
    expect(summary.n).toBe(5);
    expect(summary.p50Ms).toBe(30);
    expect(summary.minMs).toBe(10);
    expect(summary.maxMs).toBe(50);
  });
});
