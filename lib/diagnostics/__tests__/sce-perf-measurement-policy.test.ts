import { describe, expect, it } from "vitest";
import {
  buildReadonlyPlannerWeekUrl,
  resolveScePerfMeasurementBaseUrl,
  SCE_PERF_MEASUREMENT_CONFIRM,
} from "@/lib/diagnostics/sce-perf-measurement-policy";

describe("sce-perf-measurement-policy", () => {
  it("allowlists canonical STAGE host over https", () => {
    const result = resolveScePerfMeasurementBaseUrl(
      "https://fcallschwil.sportclubevo.com",
    );
    expect(result.ok).toBe(true);
  });

  it("rejects non-allowlisted hosts", () => {
    const result = resolveScePerfMeasurementBaseUrl("https://example.com");
    expect(result.ok).toBe(false);
  });

  it("builds Standardplan week URL without plan param", () => {
    const href = buildReadonlyPlannerWeekUrl(
      "https://fcallschwil.sportclubevo.com",
      "2026-09-29",
    );
    expect(href).toBe(
      "https://fcallschwil.sportclubevo.com/dashboard/planner/week?week=2026-09-29",
    );
    expect(href.includes("plan=")).toBe(false);
  });

  it("requires explicit measurement confirm constant", () => {
    expect(SCE_PERF_MEASUREMENT_CONFIRM).toBe("RUN_SCE_PERF_MEASUREMENT");
  });
});
