import { describe, expect, it } from "vitest";
import { isPlayerReleaseValidForTargetActivity } from "@/lib/match-squad/player-release-target-validity";

const baseRelease = {
  status: "ACTIVE" as const,
  scope: "PERIOD" as const,
  targetTeamSeasonId: "target-ts",
  eventId: null,
  trainingSessionId: null,
  validFrom: new Date("2026-10-01T00:00:00.000Z"),
  validUntil: new Date("2026-11-30T00:00:00.000Z"),
};

describe("isPlayerReleaseValidForTargetActivity", () => {
  it("accepts active period release on activity date", () => {
    expect(
      isPlayerReleaseValidForTargetActivity({
        release: baseRelease,
        targetTeamSeasonId: "target-ts",
        targetEventId: "event-1",
        targetEventType: "MATCH",
        targetActivityStartAt: new Date("2026-10-17T13:00:00.000Z"),
        timezone: "Europe/Zurich",
      }),
    ).toBe(true);
  });

  it("rejects expired calendar validity", () => {
    expect(
      isPlayerReleaseValidForTargetActivity({
        release: baseRelease,
        targetTeamSeasonId: "target-ts",
        targetEventId: "event-1",
        targetEventType: "MATCH",
        targetActivityStartAt: new Date("2026-12-01T13:00:00.000Z"),
        timezone: "Europe/Zurich",
      }),
    ).toBe(false);
  });

  it("rejects wrong target team", () => {
    expect(
      isPlayerReleaseValidForTargetActivity({
        release: baseRelease,
        targetTeamSeasonId: "other-ts",
        targetEventId: "event-1",
        targetEventType: "MATCH",
        targetActivityStartAt: new Date("2026-10-17T13:00:00.000Z"),
        timezone: "Europe/Zurich",
      }),
    ).toBe(false);
  });

  it("activity-scoped release requires matching target event id", () => {
    expect(
      isPlayerReleaseValidForTargetActivity({
        release: {
          ...baseRelease,
          scope: "ACTIVITY",
          eventId: "event-a",
        },
        targetTeamSeasonId: "target-ts",
        targetEventId: "event-a",
        targetEventType: "MATCH",
        targetActivityStartAt: new Date("2026-10-17T13:00:00.000Z"),
        timezone: "Europe/Zurich",
      }),
    ).toBe(true);

    expect(
      isPlayerReleaseValidForTargetActivity({
        release: {
          ...baseRelease,
          scope: "ACTIVITY",
          eventId: "event-a",
        },
        targetTeamSeasonId: "target-ts",
        targetEventId: "event-b",
        targetEventType: "MATCH",
        targetActivityStartAt: new Date("2026-10-17T13:00:00.000Z"),
        timezone: "Europe/Zurich",
      }),
    ).toBe(false);
  });

  it("rejects training-scoped release for match discovery", () => {
    expect(
      isPlayerReleaseValidForTargetActivity({
        release: {
          ...baseRelease,
          scope: "ACTIVITY",
          trainingSessionId: "training-1",
        },
        targetTeamSeasonId: "target-ts",
        targetEventId: "event-1",
        targetEventType: "MATCH",
        targetActivityStartAt: new Date("2026-10-17T13:00:00.000Z"),
        timezone: "Europe/Zurich",
      }),
    ).toBe(false);
  });
});
