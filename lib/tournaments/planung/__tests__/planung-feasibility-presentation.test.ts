import { describe, expect, it } from "vitest";
import { analyseTournamentFeasibility } from "@/lib/tournament-scheduling/feasibility";
import { assessTournamentTiming } from "@/lib/tournament-scheduling/smart-timing";
import {
  buildPlanungFeasibilityGuidance,
  feasibilityDiagnosticUserMessage,
  resolveInitialScheduleGenerationOutcome,
  resolvePlanungRecommendedTimingFromAssessment,
} from "../planung-presentation";

describe("planung feasibility presentation", () => {
  it("maps capacity and rest diagnostics to German product copy", () => {
    expect(feasibilityDiagnosticUserMessage("CAPACITY.PITCH_MINUTES_SHORT")).toContain(
      "Zeitfenster",
    );
    expect(feasibilityDiagnosticUserMessage("REST.CANNOT_SATISFY_MIN_REST")).toContain(
      "Erholungszeiten",
    );
    expect(feasibilityDiagnosticUserMessage("CAPACITY.PITCH_MINUTES_SHORT")).not.toContain("_");
  });

  it("builds actionable guidance from canonical feasibility suggestions", () => {
    const feasibility = analyseTournamentFeasibility({
      tournamentWindow: { startUtcMs: 0, endUtcMs: 30 * 60_000 },
      config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
      fixtures: [
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
          roundIndex: 0,
          slotIndexInRound: 1,
          sideAParticipantId: "p3",
          sideBParticipantId: "p4",
        },
      ],
      participants: [{ participantId: "p1" }, { participantId: "p2" }, { participantId: "p3" }, { participantId: "p4" }],
      tournamentPitches: [
        {
          tournamentPitchId: "pitch-a",
          displayOrder: 0,
          label: "Feld 1",
          playableIntervals: [{ startUtcMs: 0, endUtcMs: 30 * 60_000 }],
        },
      ],
      breaks: [],
    });

    expect(feasibility.status).toBe("INFEASIBLE");
    const guidance = buildPlanungFeasibilityGuidance(feasibility);
    expect(guidance?.state).toBe("STRUCTURAL_CHANGE");
    expect(guidance?.recommendedTiming).toBeNull();
    expect(guidance?.summary).toMatch(/mehr Zeit oder ein zusätzliches Spielfeld/i);
  });

  it("uses smart timing durationRecommendation for guidance when oracle finds feasible pair", () => {
    const fixtures = Array.from({ length: 8 }, (_, i) => ({
      fixtureId: `f${i}`,
      stageKey: "MAIN",
      roundIndex: 0,
      slotIndexInRound: i,
      sideAParticipantId: `team-${i * 2}`,
      sideBParticipantId: `team-${i * 2 + 1}`,
    }));
    const assessment = assessTournamentTiming({
      mode: "FIXED_ASSESSMENT",
      tournamentWindow: { startUtcMs: 0, endUtcMs: 120 * 60_000 },
      config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
      fixtures,
      participants: Array.from({ length: 16 }, (_, i) => ({ participantId: `team-${i}` })),
      tournamentPitches: [
        {
          tournamentPitchId: "pitch-a",
          displayOrder: 0,
          label: "Feld 1",
        },
      ],
      breaks: [],
    });
    expect(assessment.feasibilityStatus).toBe("INFEASIBLE");
    expect(assessment.durationRecommendation).not.toBeNull();

    const recommended = resolvePlanungRecommendedTimingFromAssessment(assessment, {
      matchDurationMinutes: 30,
      transitionMinutes: 5,
    });
    expect(recommended).toEqual({
      matchDurationMinutes: assessment.durationRecommendation!.matchDurationMinutes,
      transitionMinutes: assessment.durationRecommendation!.transitionMinutes,
    });

    const guidance = buildPlanungFeasibilityGuidance(
      {
        status: "INFEASIBLE",
        diagnostics: [{ code: "CAPACITY.WINDOW_TOO_SHORT" }],
        metrics: assessment.metrics,
        suggestions: [
          { code: "REDUCE_MATCH_DURATION" },
          { code: "REDUCE_TRANSITION_DURATION" },
          { code: "ADD_TOURNAMENT_PITCH" },
        ],
      },
      assessment,
      { matchDurationMinutes: 30, transitionMinutes: 5 },
    );
    expect(guidance?.state).toBe("AUTO_FIX");
    expect(guidance?.recommendedTiming).toEqual(recommended);
    expect(guidance?.contextLinks).toHaveLength(0);
  });

  it("reports structured infeasible generation without persisting assignments", () => {
    const outcome = resolveInitialScheduleGenerationOutcome({
      optimisation: {
        status: "INFEASIBLE_PROVEN",
        assignments: [],
        diagnostics: [],
        metrics: {} as never,
      },
      feasibility: {
        status: "INFEASIBLE",
        diagnostics: [{ code: "CAPACITY.PITCH_MINUTES_SHORT" }],
        metrics: {} as never,
        suggestions: [{ code: "REDUCE_MATCH_DURATION" }],
      },
    });

    expect(outcome.succeeded).toBe(false);
    expect(outcome.guidance?.state).toBe("STRUCTURAL_CHANGE");
    expect(outcome.guidance?.recommendedTiming).toBeNull();
  });
});
