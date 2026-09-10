import { describe, expect, it } from "vitest";
import {
  computeGracePeriodEnd,
  DEFAULT_DUNNING_GRACE_DAYS,
  isDunningExemptionActive,
} from "../dunning-policy";

describe("dunning-policy", () => {
  it("documents default grace period as 14 days", () => {
    expect(DEFAULT_DUNNING_GRACE_DAYS).toBe(14);
  });

  it("computes grace end from first failure", () => {
    const start = new Date("2026-09-10T12:00:00.000Z");
    const end = computeGracePeriodEnd(start, 14);
    expect(end.toISOString()).toBe("2026-09-24T12:00:00.000Z");
  });

  it("detects active exemption window", () => {
    const now = new Date("2026-09-10T12:00:00.000Z");
    expect(isDunningExemptionActive(new Date("2026-09-11T12:00:00.000Z"), now)).toBe(true);
    expect(isDunningExemptionActive(new Date("2026-09-09T12:00:00.000Z"), now)).toBe(false);
  });
});
