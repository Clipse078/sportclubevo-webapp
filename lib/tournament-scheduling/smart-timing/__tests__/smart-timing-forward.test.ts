import { describe, expect, it } from "vitest";
import { assessTournamentTiming } from "../assess";
import { BASE_MS, baseInput, sequentialFixtures, tournamentPitch, windowFromClock } from "./helpers";

describe("Smart Timing — forward matrix", () => {
  it("A. 1 pitch, 8 fixtures, 12+3 → 120 minute required span", () => {
    const fixtures = sequentialFixtures(8);
    const result = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
        endBoundaryKnown: false,
      }),
    );
    expect(result.requiredSpanMinutes).toBe(120);
    expect(result.requiredSpanKind).toBe("EXACT_WITNESS");
    expect(result.predictedFinishUtcMs).toBe(BASE_MS + 120 * 60_000);
    expect(result.feasibilityStatus).not.toBe("INFEASIBLE");
  });

  it("B. 2 pitches halves parallel span for 8 fixtures", () => {
    const fixtures = sequentialFixtures(8);
    const onePitch = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        tournamentPitches: [tournamentPitch("p1", 0)],
        endBoundaryKnown: false,
      }),
    );
    const twoPitch = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        tournamentPitches: [tournamentPitch("p1", 0), tournamentPitch("p2", 1)],
        endBoundaryKnown: false,
      }),
    );
    expect(twoPitch.requiredSpanMinutes).toBeLessThan(onePitch.requiredSpanMinutes);
  });

  it("C. 4 pitches with 8 fixtures", () => {
    const fixtures = sequentialFixtures(8);
    const result = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        tournamentPitches: [
          tournamentPitch("p1", 0),
          tournamentPitch("p2", 1),
          tournamentPitch("p3", 2),
          tournamentPitch("p4", 3),
        ],
        endBoundaryKnown: false,
      }),
    );
    expect(result.requiredSpanKind).toBe("EXACT_WITNESS");
    expect(result.feasibilityStatus).not.toBe("INFEASIBLE");
  });

  it("D. all-pitch break reduces effective capacity", () => {
    const fixtures = sequentialFixtures(4);
    const without = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        tournamentWindow: windowFromClock(0, 600),
        endBoundaryKnown: false,
      }),
    );
    const withBreak = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        tournamentWindow: windowFromClock(0, 600),
        endBoundaryKnown: false,
        breaks: [
          {
            breakId: "b1",
            startUtcMs: BASE_MS + 30 * 60_000,
            endUtcMs: BASE_MS + 60 * 60_000,
            scope: "ALL_PITCHES",
          },
        ],
      }),
    );
    expect(withBreak.effectivePlayableCapacityMinutes).toBeLessThan(
      without.effectivePlayableCapacityMinutes,
    );
  });

  it("E. selected-pitch break", () => {
    const fixtures = sequentialFixtures(4);
    const result = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        tournamentPitches: [tournamentPitch("p1", 0), tournamentPitch("p2", 1)],
        endBoundaryKnown: false,
        breaks: [
          {
            breakId: "b1",
            startUtcMs: BASE_MS + 15 * 60_000,
            endUtcMs: BASE_MS + 45 * 60_000,
            scope: "SELECTED_PITCHES",
            tournamentPitchIds: ["p1"],
          },
        ],
      }),
    );
    expect(result.effectivePlayableCapacityMinutes).toBeGreaterThan(0);
    expect(result.feasibilityStatus).not.toBe("INFEASIBLE");
  });

  it("F. overlapping breaks merged deterministically", () => {
    const fixtures = sequentialFixtures(2);
    const result = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        endBoundaryKnown: false,
        breaks: [
          {
            breakId: "b1",
            startUtcMs: BASE_MS + 10 * 60_000,
            endUtcMs: BASE_MS + 40 * 60_000,
            scope: "ALL_PITCHES",
          },
          {
            breakId: "b2",
            startUtcMs: BASE_MS + 30 * 60_000,
            endUtcMs: BASE_MS + 50 * 60_000,
            scope: "ALL_PITCHES",
          },
        ],
      }),
    );
    expect(result.diagnostics.some((d) => d.code === "BREAK.INVALID")).toBe(false);
  });

  it("G. resolved participant minimum rest", () => {
    const fixtures: ReturnType<typeof sequentialFixtures> = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "team-a",
        sideBParticipantId: "team-b",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "team-a",
        sideBParticipantId: "team-c",
      },
    ];
    const result = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        participants: [{ participantId: "team-a" }, { participantId: "team-b" }, { participantId: "team-c" }],
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 30 },
        tournamentWindow: windowFromClock(0, 600),
        endBoundaryKnown: false,
      }),
    );
    expect(result.participantRestProofStatus).toBe("PROVEN");
    expect(result.requiredSpanMinutes).toBeGreaterThanOrEqual(12 + 30 + 12);
  });

  it("H. unresolved GROUP_RANK sides", () => {
    const fixtures = [
      {
        fixtureId: "qf1",
        stageKey: "KO",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "placeholder-a",
        sideBParticipantId: "placeholder-b",
        sideSources: [
          { side: "A" as const, sourceType: "QUALIFICATION_REFERENCE" as const, participantId: null },
          { side: "B" as const, sourceType: "QUALIFICATION_REFERENCE" as const, participantId: null },
        ],
      },
    ];
    const result = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        participants: [],
        endBoundaryKnown: false,
      }),
    );
    expect(result.participantRestProofStatus).toBe("UNRESOLVED");
    expect(result.nudges.some((n) => n.code === "UNRESOLVED_PARTICIPANT_REST")).toBe(true);
  });

  it("I. unresolved WINNER_OF_FIXTURE", () => {
    const fixtures = [
      {
        fixtureId: "final",
        stageKey: "KO",
        roundIndex: 2,
        slotIndexInRound: 0,
        sideAParticipantId: "w1",
        sideBParticipantId: "w2",
        sideSources: [
          { side: "A" as const, sourceType: "WINNER_OF_FIXTURE" as const, participantId: null },
          { side: "B" as const, sourceType: "WINNER_OF_FIXTURE" as const, participantId: null },
        ],
      },
    ];
    const result = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        participants: [],
        endBoundaryKnown: false,
      }),
    );
    expect(result.participantRestProofStatus).toBe("UNRESOLVED");
  });

  it("J. break ending exactly at fixture start (half-open)", () => {
    const fixtures = sequentialFixtures(1);
    const breakEnd = BASE_MS + 15 * 60_000;
    const result = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 120),
        endBoundaryKnown: false,
        breaks: [
          {
            breakId: "b1",
            startUtcMs: BASE_MS,
            endUtcMs: breakEnd,
            scope: "ALL_PITCHES",
          },
        ],
      }),
    );
    expect(result.feasibilityStatus).not.toBe("INFEASIBLE");
    expect(result.predictedFinishUtcMs).toBe(breakEnd + 15 * 60_000);
  });

  it("K. fixture ending exactly when break starts", () => {
    const fixtures = sequentialFixtures(1);
    const result = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 120),
        endBoundaryKnown: false,
        breaks: [
          {
            breakId: "b1",
            startUtcMs: BASE_MS + 15 * 60_000,
            endUtcMs: BASE_MS + 30 * 60_000,
            scope: "ALL_PITCHES",
          },
        ],
      }),
    );
    expect(result.predictedFinishUtcMs).toBe(BASE_MS + 15 * 60_000);
  });
});
