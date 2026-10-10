import { describe, expect, it } from "vitest";
import {
  dateRangesOverlap,
  resolvePlayerReleaseDisplayState,
} from "@/lib/match-squad/player-release-lifecycle";

describe("player-release-lifecycle", () => {
  it("derives EXPIRED from validUntil in the past", () => {
    const state = resolvePlayerReleaseDisplayState({
      status: "ACTIVE",
      validFrom: new Date("2026-09-01T00:00:00.000Z"),
      validUntil: new Date("2026-09-30T00:00:00.000Z"),
      timezone: "Europe/Zurich",
      now: new Date("2026-10-10T12:00:00.000Z"),
    });
    expect(state.phase).toBe("EXPIRED");
    expect(state.label).toBe("Abgelaufen");
  });

  it("keeps REVOKED independent of validity dates", () => {
    const state = resolvePlayerReleaseDisplayState({
      status: "REVOKED",
      validFrom: new Date("2026-10-01T00:00:00.000Z"),
      validUntil: new Date("2026-12-31T00:00:00.000Z"),
      timezone: "Europe/Zurich",
      now: new Date("2026-10-10T12:00:00.000Z"),
    });
    expect(state.phase).toBe("REVOKED");
  });

  it("detects overlapping calendar ranges", () => {
    const aFrom = new Date("2026-10-10T00:00:00.000Z");
    const aUntil = new Date("2026-11-30T00:00:00.000Z");
    const bFrom = new Date("2026-10-15T00:00:00.000Z");
    const bUntil = new Date("2026-10-20T00:00:00.000Z");
    expect(dateRangesOverlap(aFrom, aUntil, bFrom, bUntil)).toBe(true);
    expect(
      dateRangesOverlap(
        aFrom,
        aUntil,
        new Date("2026-12-01T00:00:00.000Z"),
        new Date("2026-12-10T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
