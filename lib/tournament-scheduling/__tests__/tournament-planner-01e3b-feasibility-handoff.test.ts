/**
 * SCE-TOURNAMENT-PLANNER-01E3B — 01D accepts group-scoped concrete fixtures.
 */

import { describe, expect, it } from "vitest";
import { analyseTournamentFeasibility } from "../feasibility";
import { planAutomaticGroupTopology } from "../group-formation";
import { generateRoundRobinFixtures } from "../fixtures";

describe("01E3B → 01D handoff", () => {
  it("accepts group-scoped round robin fixtures structurally", () => {
    const participantIds = Array.from({ length: 8 }, (_, i) => `gp-${i}`);
    const plan = planAutomaticGroupTopology(participantIds, 2);
    const fixtures = plan.flatMap((group, index) =>
      generateRoundRobinFixtures({
        participantIds: group.participantIds,
        config: {
          format: "ROUND_ROBIN",
          stageKey: "MAIN",
          generatorKeyGroupScope: `g-${index}`,
        },
      }).map((fixture) => ({ groupKey: `group-${index}`, fixture })),
    );

    const window = { startUtcMs: 0, endUtcMs: 12 * 60 * 60_000 };
    const result = analyseTournamentFeasibility({
      tournamentWindow: window,
      config: { matchDurationMinutes: 20, transitionMinutes: 5, minRestMinutes: 10 },
      participants: participantIds.map((participantId) => ({ participantId })),
      fixtures: fixtures.map(({ groupKey, fixture }, index) => ({
        fixtureId: `fx-${index}`,
        stageKey: fixture.stageKey,
        tournamentGroupId: groupKey,
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
        {
          tournamentPitchId: "pitch-c",
          label: "Feld 3",
          displayOrder: 2,
          playableIntervals: [window],
        },
        {
          tournamentPitchId: "pitch-d",
          label: "Feld 4",
          displayOrder: 3,
          playableIntervals: [window],
        },
      ],
      breaks: [],
    });

    expect(result.status).not.toBe("INFEASIBLE");
  });
});
