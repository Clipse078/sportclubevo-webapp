import { describe, expect, it } from "vitest";
import { optimiseTournamentSchedule } from "../optimise";
import { optimiserInput, tournamentPitch, windowFromClock } from "./helpers";

describe("01F2 — knockout / group dependencies", () => {
  it("WINNER_OF_FIXTURE cannot start before source completes", () => {
    const fixtures = [
      {
        fixtureId: "semi-1",
        stageKey: "KO",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        fixtureId: "final",
        stageKey: "KO",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p3",
        sideSources: [
          {
            side: "A" as const,
            sourceType: "WINNER_OF_FIXTURE" as const,
            participantId: null,
            sourceFixtureId: "semi-1",
          },
          { side: "B" as const, sourceType: "CONCRETE_PARTICIPANT" as const, participantId: "p3" },
        ],
      },
    ];
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
        config: { matchDurationMinutes: 10, transitionMinutes: 5, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 120),
      }),
    );
    expect(result.status).toBe("OPTIMAL");
    const semi = result.assignments.find((a) => a.fixtureId === "semi-1")!;
    const fin = result.assignments.find((a) => a.fixtureId === "final")!;
    expect(fin.startUtcMs).toBeGreaterThanOrEqual(semi.resourceEndUtcMs);
  });

  it("GROUP_RANK KO waits for all group fixtures", () => {
    const fixtures = [
      {
        fixtureId: "g1",
        stageKey: "GROUP",
        tournamentGroupId: "grp-a",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        fixtureId: "g2",
        stageKey: "GROUP",
        tournamentGroupId: "grp-a",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p3",
      },
      {
        fixtureId: "ko1",
        stageKey: "KO",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p9",
        sideBParticipantId: "p10",
        sideSources: [
          {
            side: "A" as const,
            sourceType: "QUALIFICATION_REFERENCE" as const,
            participantId: null,
            sourceGroupId: "grp-a",
          },
          { side: "B" as const, sourceType: "CONCRETE_PARTICIPANT" as const, participantId: "p10" },
        ],
      },
    ];
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        participants: [
          { participantId: "p1" },
          { participantId: "p2" },
          { participantId: "p3" },
          { participantId: "p9" },
          { participantId: "p10" },
        ],
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 120),
      }),
    );
    expect(result.status).toBe("OPTIMAL");
    const ko = result.assignments.find((a) => a.fixtureId === "ko1")!;
    const groupEnds = result.assignments
      .filter((a) => a.fixtureId === "g1" || a.fixtureId === "g2")
      .map((a) => a.resourceEndUtcMs);
    expect(ko.startUtcMs).toBeGreaterThanOrEqual(Math.max(...groupEnds));
    expect(result.participantRestProofStatus).toBe("PARTIAL");
  });
});

describe("01F2 — qualification structural scheduling", () => {
  it("schedules unresolved sides without fabricating rest proof", () => {
    const fixtures = [
      {
        fixtureId: "qf",
        stageKey: "KO",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
        sideSources: [
          { side: "A" as const, sourceType: "WINNER_OF_FIXTURE" as const, participantId: null },
          { side: "B" as const, sourceType: "WINNER_OF_FIXTURE" as const, participantId: null },
        ],
      },
    ];
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 5 },
        tournamentWindow: windowFromClock(0, 30),
      }),
    );
    expect(result.status).toBe("OPTIMAL");
    expect(result.assignments).toHaveLength(1);
    expect(result.participantRestProofStatus).toBe("UNRESOLVED");
  });
});
