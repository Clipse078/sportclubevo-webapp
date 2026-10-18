import { describe, expect, it } from "vitest";
import {
  FEASIBILITY_COMPLETE_SEARCH_MAX_FIXTURES,
  FEASIBILITY_MAX_FIXTURES,
  SMART_TIMING_HEAVY_OPPORTUNITY_MAX_FIXTURES,
  analyseTournamentFeasibility,
} from "@/lib/tournament-scheduling/feasibility";
import {
  canonicalizeParticipantIds,
  generateRoundRobinFixtures,
} from "@/lib/tournament-scheduling/fixtures";

describe("01M technical-limit requalification", () => {
  it("does not expose a 16-participant product maximum in feasibility", () => {
    const ids = canonicalizeParticipantIds(
      Array.from({ length: 20 }, (_, i) => ({ id: `p-${i}`, displayOrder: i })),
    );
    const generated = generateRoundRobinFixtures({
      participantIds: ids,
      config: { format: "ROUND_ROBIN", meetingsPerOpponent: 1, homeAwayRelevance: "OFF" },
    });
    const fixtures = generated.map((f, index) => ({
      fixtureId: `f-${index}`,
      stageKey: f.stageKey,
      roundIndex: f.roundIndex,
      slotIndexInRound: f.slotIndexInRound,
      sideAParticipantId: f.sideAParticipantId,
      sideBParticipantId: f.sideBParticipantId,
    }));
    const result = analyseTournamentFeasibility({
      tournamentWindow: {
        startUtcMs: Date.UTC(2026, 7, 1, 8, 0, 0),
        endUtcMs: Date.UTC(2026, 7, 2, 20, 0, 0),
      },
      config: { matchDurationMinutes: 10, transitionMinutes: 2, minRestMinutes: 0 },
      participants: ids.map((participantId) => ({ participantId })),
      tournamentPitches: Array.from({ length: 12 }, (_, i) => ({
        tournamentPitchId: `p-${i}`,
        displayOrder: i,
        label: `p-${i}`,
        playableIntervals: [] as [],
      })),
      fixtures,
      breaks: [],
    });
    expect(result.status).toBe("UNRESOLVED");
    expect(result.diagnostics.some((d) => d.code === "LIMIT.PARTICIPANTS_EXCEEDED")).toBe(false);
    expect(
      result.diagnostics.some(
        (d) =>
          d.code === "ANALYSIS.COMPLETE_SEARCH_BOUNDARY" ||
          d.code === "SLOTS.TOO_MANY_CANDIDATES",
      ),
    ).toBe(true);
  });

  it("uses complete-search fixture threshold as UNRESOLVED boundary, not invalid tournament", () => {
    expect(FEASIBILITY_MAX_FIXTURES).toBe(FEASIBILITY_COMPLETE_SEARCH_MAX_FIXTURES);
    expect(FEASIBILITY_COMPLETE_SEARCH_MAX_FIXTURES).toBeGreaterThan(16);
  });

  it("documents Smart Timing heavy-opportunity skip threshold separately from participant count", () => {
    expect(SMART_TIMING_HEAVY_OPPORTUNITY_MAX_FIXTURES).toBe(16);
  });
});
