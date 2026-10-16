/**
 * SCE-TOURNAMENT-PLANNER-01E1 — 2× RR fixtures accepted by generic 01D feasibility.
 */

import { describe, expect, it } from "vitest";
import { analyseTournamentFeasibility } from "../feasibility";
import { generateRoundRobinFixtures } from "../fixtures";

describe("01E1 → 01D handoff", () => {
  it("accepts a 2× round-robin fixture set structurally", () => {
    const participantIds = ["p1", "p2", "p3", "p4"];
    const generated = generateRoundRobinFixtures({
      participantIds,
      config: { format: "ROUND_ROBIN", meetingsPerOpponent: 2 },
    });

    const window = { startUtcMs: 0, endUtcMs: 8 * 60 * 60_000 };
    const result = analyseTournamentFeasibility({
      tournamentWindow: window,
      config: { matchDurationMinutes: 20, transitionMinutes: 5, minRestMinutes: 10 },
      participants: participantIds.map((participantId) => ({ participantId })),
      fixtures: generated.map((fixture, index) => ({
        fixtureId: `fx-${index}`,
        stageKey: fixture.stageKey,
        roundIndex: fixture.roundIndex,
        slotIndexInRound: fixture.slotIndexInRound,
        sideAParticipantId: fixture.sideAParticipantId,
        sideBParticipantId: fixture.sideBParticipantId,
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
