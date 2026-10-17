import { describe, expect, it } from "vitest";
import { assessTournamentTiming } from "../assess";
import { BASE_MS, baseInput, sequentialFixtures, tournamentPitch, windowFromClock } from "./helpers";

describe("Smart Timing — fixed window assessment", () => {
  it("comfortably feasible with reserve", () => {
    const result = assessTournamentTiming(
      baseInput({
        mode: "FIXED_ASSESSMENT",
        fixtures: sequentialFixtures(4),
        tournamentWindow: windowFromClock(0, 240),
      }),
    );
    expect(["FEASIBLE", "TIGHT"]).toContain(result.feasibilityStatus);
    expect(result.reserveMinutes).not.toBeNull();
    expect(result.reserveMinutes!).toBeGreaterThan(0);
  });

  it("tight window", () => {
    const result = assessTournamentTiming(
      baseInput({
        mode: "FIXED_ASSESSMENT",
        fixtures: sequentialFixtures(8),
        tournamentWindow: windowFromClock(0, 120),
      }),
    );
    expect(["FEASIBLE", "TIGHT"]).toContain(result.feasibilityStatus);
  });

  it("infeasible due to window", () => {
    const result = assessTournamentTiming(
      baseInput({
        mode: "FIXED_ASSESSMENT",
        fixtures: sequentialFixtures(8),
        tournamentWindow: windowFromClock(0, 60),
      }),
    );
    expect(result.feasibilityStatus).toBe("INFEASIBLE");
    expect(result.adjustments.length).toBeGreaterThan(0);
  });

  it("infeasible due to pitch blocks", () => {
    const result = assessTournamentTiming(
      baseInput({
        mode: "FIXED_ASSESSMENT",
        fixtures: sequentialFixtures(8),
        tournamentWindow: windowFromClock(0, 120),
        breaks: [
          {
            breakId: "b1",
            startUtcMs: BASE_MS,
            endUtcMs: BASE_MS + 90 * 60_000,
            scope: "ALL_PITCHES",
          },
        ],
      }),
    );
    expect(result.feasibilityStatus).toBe("INFEASIBLE");
  });

  it("infeasible due to resolved participant rest", () => {
    const fixtures = [
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
        mode: "FIXED_ASSESSMENT",
        fixtures,
        participants: [{ participantId: "team-a" }, { participantId: "team-b" }, { participantId: "team-c" }],
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 60 },
        tournamentWindow: windowFromClock(0, 74),
      }),
    );
    expect(result.feasibilityStatus).toBe("INFEASIBLE");
  });

  it("structurally feasible but participant-rest unresolved", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "KO",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "x",
        sideBParticipantId: "y",
        sideSources: [
          { side: "A" as const, sourceType: "QUALIFICATION_REFERENCE" as const, participantId: null },
          { side: "B" as const, sourceType: "QUALIFICATION_REFERENCE" as const, participantId: null },
        ],
      },
    ];
    const result = assessTournamentTiming(
      baseInput({
        mode: "FIXED_ASSESSMENT",
        fixtures,
        participants: [],
        tournamentWindow: windowFromClock(0, 120),
      }),
    );
    expect(result.participantRestProofStatus).toBe("UNRESOLVED");
    expect(result.feasibilityStatus).not.toBe("INFEASIBLE");
  });

  it("recommendations are never auto-applied", () => {
    const result = assessTournamentTiming(
      baseInput({
        mode: "FIXED_ASSESSMENT",
        fixtures: sequentialFixtures(8),
        tournamentWindow: windowFromClock(0, 60),
      }),
    );
    expect(result.recommendationsAutoApplied).toBe(false);
  });
});
