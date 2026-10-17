/**
 * SCE-TOURNAMENT-PLANNER-01F1 — reuses 01D feasibility (no parallel engine).
 */

import { describe, expect, it } from "vitest";
import { analyseTournamentFeasibility } from "../feasibility";
import { assessTournamentTiming } from "../smart-timing";

describe("01F1 — 01D feasibility handoff", () => {
  it("aligns fixed assessment status with analyseTournamentFeasibility", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
    ];
    const start = Date.UTC(2026, 6, 1, 10, 0, 0);
    const window = { startUtcMs: start, endUtcMs: start + 120 * 60_000 };
    const config = { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 };
    const feasibility = analyseTournamentFeasibility({
      tournamentWindow: window,
      config,
      fixtures,
      participants: [{ participantId: "p1" }, { participantId: "p2" }],
      tournamentPitches: [{ tournamentPitchId: "tp1", displayOrder: 0, label: "1", playableIntervals: [] }],
      breaks: [],
    });
    const timing = assessTournamentTiming({
      mode: "FIXED_ASSESSMENT",
      tournamentWindow: window,
      config,
      fixtures,
      participants: [{ participantId: "p1" }, { participantId: "p2" }],
      tournamentPitches: [{ tournamentPitchId: "tp1", displayOrder: 0, label: "1" }],
      breaks: [],
    });
    expect(timing.feasibilityStatus).toBe(feasibility.status);
  });
});
