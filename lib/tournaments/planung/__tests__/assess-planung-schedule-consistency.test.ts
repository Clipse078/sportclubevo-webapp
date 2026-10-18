import { describe, expect, it } from "vitest";
import { assessPlanungScheduleConsistency } from "../assess-planung-schedule-consistency";

const window = { startUtcMs: 0, endUtcMs: 8 * 60 * 60_000 };
const config = { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 };
const pitches = [
  {
    tournamentPitchId: "p1",
    displayOrder: 0,
    label: "Feld 1",
    playableIntervals: [{ startUtcMs: 0, endUtcMs: 8 * 60 * 60_000 }],
  },
];
const fixtures = [
  {
    fixtureId: "f1",
    stageKey: "MAIN",
    roundIndex: 0,
    slotIndexInRound: 0,
    sideAParticipantId: "a",
    sideBParticipantId: "b",
  },
];

describe("assessPlanungScheduleConsistency", () => {
  it("returns MATCHES when assignment duration matches config", () => {
    const startMs = 3_600_000;
    const endMs = startMs + 12 * 60_000;
    expect(
      assessPlanungScheduleConsistency({
        tournamentWindow: window,
        config,
        fixtures,
        assignments: [
          {
            fixtureId: "f1",
            tournamentPitchId: "p1",
            startAt: new Date(startMs).toISOString(),
            endAt: new Date(endMs).toISOString(),
            scheduleLockDimension: null,
          },
        ],
        pitches,
        breaks: [],
        dependencies: new Map(),
      }),
    ).toBe("MATCHES");
  });

  it("returns NEEDS_REGENERATION when persisted end no longer matches Spieldauer", () => {
    expect(
      assessPlanungScheduleConsistency({
        tournamentWindow: window,
        config,
        fixtures,
        assignments: [
          {
            fixtureId: "f1",
            tournamentPitchId: "p1",
            startAt: new Date(3_600_000).toISOString(),
            endAt: new Date(3_600_000 + 20 * 60_000).toISOString(),
            scheduleLockDimension: null,
          },
        ],
        pitches,
        breaks: [],
        dependencies: new Map(),
      }),
    ).toBe("NEEDS_REGENERATION");
  });
});
