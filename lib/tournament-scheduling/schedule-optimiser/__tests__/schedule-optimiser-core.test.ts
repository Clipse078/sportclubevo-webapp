import { describe, expect, it } from "vitest";
import { optimiseTournamentSchedule } from "../optimise";
import {
  optimiserInput,
  sequentialFixtures,
  tournamentPitch,
  windowFromClock,
} from "./helpers";

describe("01F2 — basic serial scheduling", () => {
  it("assigns all fixtures once on one pitch with deterministic order", () => {
    const fixtures = sequentialFixtures(4, [
      ["p1", "p2"],
      ["p3", "p4"],
      ["p1", "p3"],
      ["p2", "p4"],
    ]);
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 60),
      }),
    );
    expect(result.status).toBe("OPTIMAL");
    expect(result.assignments).toHaveLength(4);
    expect(result.hardConstraintValidationOk).toBe(true);
    const ids = result.assignments.map((a) => a.fixtureId);
    expect(new Set(ids).size).toBe(4);
    const sorted = [...result.assignments].sort((a, b) => a.startUtcMs - b.startUtcMs);
    expect(sorted[0]!.startUtcMs).toBeLessThan(sorted[1]!.startUtcMs);
    expect(sorted.every((a) => a.tournamentPitchId === "pitch-a")).toBe(true);
  });
});

describe("01F2 — multi-pitch parallelism", () => {
  const fixtures = sequentialFixtures(8);

  it.each([2, 4, 8])("uses %i pitches without overlap", (pitchCount) => {
    const pitches = Array.from({ length: pitchCount }, (_, i) =>
      tournamentPitch(`pitch-${i + 1}`, i),
    );
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: pitches,
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 240),
      }),
    );
    expect(["OPTIMAL", "FEASIBLE_NOT_PROVEN_OPTIMAL"]).toContain(result.status);
    expect(result.assignments).toHaveLength(8);
    for (const pitch of pitches) {
      const onPitch = result.assignments.filter((a) => a.tournamentPitchId === pitch.tournamentPitchId);
      for (let i = 0; i < onPitch.length; i += 1) {
        for (let j = i + 1; j < onPitch.length; j += 1) {
          const a = onPitch[i]!;
          const b = onPitch[j]!;
          const overlap = a.startUtcMs < b.resourceEndUtcMs && b.startUtcMs < a.resourceEndUtcMs;
          expect(overlap).toBe(false);
        }
      }
    }
  });
});

describe("01F2 — breaks", () => {
  it("respects all-pitch and selected-pitch breaks", () => {
    const fixtures = sequentialFixtures(4);
    const breakAll = {
      breakId: "b-all",
      startUtcMs: windowFromClock(30, 30).startUtcMs,
      endUtcMs: windowFromClock(45, 45).startUtcMs,
      scope: "ALL_PITCHES" as const,
    };
    const breakSelected = {
      breakId: "b-p2",
      startUtcMs: windowFromClock(60, 60).startUtcMs,
      endUtcMs: windowFromClock(75, 75).startUtcMs,
      scope: "SELECTED_PITCHES" as const,
      tournamentPitchIds: ["pitch-b"],
    };
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
        breaks: [breakAll, breakSelected],
        tournamentWindow: windowFromClock(0, 180),
      }),
    );
    expect(["OPTIMAL", "FEASIBLE_NOT_PROVEN_OPTIMAL"]).toContain(result.status);
    for (const a of result.assignments) {
      const crossesAll =
        a.startUtcMs < breakAll.endUtcMs && breakAll.startUtcMs < a.resourceEndUtcMs;
      expect(crossesAll).toBe(false);
      if (a.tournamentPitchId === "pitch-b") {
        const crossesSel =
          a.startUtcMs < breakSelected.endUtcMs && breakSelected.startUtcMs < a.resourceEndUtcMs;
        expect(crossesSel).toBe(false);
      }
    }
  });
});

describe("01F2 — minimum rest", () => {
  it("rejects placement one minute below minimum rest", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p3",
      },
    ];
    const config = { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 15 };
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
        config,
        tournamentWindow: windowFromClock(0, 120),
      }),
    );
    expect(["OPTIMAL", "FEASIBLE_NOT_PROVEN_OPTIMAL"]).toContain(result.status);
    const p1 = result.assignments.filter((a) =>
      ["f1", "f2"].includes(a.fixtureId),
    );
    const sorted = p1.sort((a, b) => a.startUtcMs - b.startUtcMs);
    const gapMin = (sorted[1]!.startUtcMs - sorted[0]!.endUtcMs) / 60_000;
    expect(gapMin).toBeGreaterThanOrEqual(15);
  });
});

describe("01F2 — duplicate source team participants", () => {
  it("schedules tournament participant ids independently", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "tp-a",
        sideBParticipantId: "tp-b",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "tp-a-clone",
        sideBParticipantId: "tp-c",
      },
    ];
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        participants: [
          { participantId: "tp-a" },
          { participantId: "tp-a-clone" },
          { participantId: "tp-b" },
          { participantId: "tp-c" },
        ],
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 60),
      }),
    );
    expect(["OPTIMAL", "FEASIBLE_NOT_PROVEN_OPTIMAL"]).toContain(result.status);
    expect(result.assignments).toHaveLength(2);
  });
});
