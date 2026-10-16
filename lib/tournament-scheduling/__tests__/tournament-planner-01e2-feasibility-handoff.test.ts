/**
 * SCE-TOURNAMENT-PLANNER-01E2 — 01D handoff for Smart Mix fixture sets.
 */

import { describe, expect, it } from "vitest";
import { analyseTournamentFeasibility } from "../feasibility";
import { generateSmartMixFixtures } from "../fixtures";

describe("01E2 feasibility handoff", () => {
  it("accepts generated Smart Mix fixtures without round-robin shape", () => {
    const participantIds = ["p1", "p2", "p3", "p4"];
    const generated = generateSmartMixFixtures({
      participantIds,
      config: { targetMatchesPerParticipant: 3 },
    });
    const window = { startUtcMs: 0, endUtcMs: 8 * 60 * 60_000 };
    const result = analyseTournamentFeasibility({
      tournamentWindow: window,
      config: { matchDurationMinutes: 20, transitionMinutes: 5, minRestMinutes: 10 },
      participants: participantIds.map((participantId) => ({ participantId })),
      fixtures: generated.map((g, index) => ({
        fixtureId: `mix-${index}`,
        stageKey: g.stageKey,
        roundIndex: g.roundIndex,
        slotIndexInRound: g.slotIndexInRound,
        sideAParticipantId: g.sideAParticipantId,
        sideBParticipantId: g.sideBParticipantId,
      })),
      tournamentPitches: [
        {
          tournamentPitchId: "pitch-a",
          label: "Feld 1",
          displayOrder: 0,
          playableIntervals: [window],
        },
        {
          tournamentPitchId: "pitch-b",
          label: "Feld 2",
          displayOrder: 1,
          playableIntervals: [window],
        },
      ],
      breaks: [],
    });
    expect(result.status).not.toBe("INFEASIBLE");
  });
});
