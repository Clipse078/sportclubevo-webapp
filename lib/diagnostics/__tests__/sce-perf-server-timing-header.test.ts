import { describe, expect, it } from "vitest";
import { buildServerTimingHeaderValue } from "@/lib/diagnostics/sce-perf-server-timing-header";

describe("sce-perf-server-timing-header", () => {
  it("returns null when timing gate is off", () => {
    const prev = process.env.SCE_PERF_TIMING;
    delete process.env.SCE_PERF_TIMING;
    delete process.env.PLANNER_PERF_TIMING;
    expect(
      buildServerTimingHeaderValue({
        entries: [{ label: "auth", durationMs: 12 }],
        totalMs: 12,
      }),
    ).toBeNull();
    if (prev === undefined) delete process.env.SCE_PERF_TIMING;
    else process.env.SCE_PERF_TIMING = prev;
  });

  it("builds Server-Timing tokens when gate is on", () => {
    process.env.SCE_PERF_TIMING = "1";
    const value = buildServerTimingHeaderValue({
      route: "training",
      entries: [
        { label: "auth-rbac", durationMs: 10.2 },
        { label: "training-core-queries", durationMs: 250.4 },
      ],
      totalMs: 260.6,
    });
    expect(value).toContain("auth-rbac;dur=10.2");
    expect(value).toContain("total;dur=260.6");
    delete process.env.SCE_PERF_TIMING;
  });
});
