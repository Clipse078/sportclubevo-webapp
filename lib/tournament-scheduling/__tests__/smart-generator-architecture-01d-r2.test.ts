/**
 * SCE-TOURNAMENT-PLANNER-01D-R2 — smart generator architecture contracts.
 */

import { describe, expect, it } from "vitest";
import { analyseTournamentFeasibility } from "../feasibility";
import {
  AUTOMATIC_GENERATION_IS_PRIMARY,
  COMPETITION_MODES,
  CURRENT_MVP_PARTICIPANT_LIMIT,
  CURRENT_ROUND_ROBIN_MEETINGS_PER_OPPONENT,
  FEASIBILITY_REQUIRES_ROUND_ROBIN_SOURCE,
  FUTURE_KNOCKOUT_QUALIFICATION_MODEL_DEFINED,
  GENERATION_PIPELINE_STAGES,
  GROUP_MIX_GENERATORS,
  HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT,
  MANUAL_ADJUSTMENT_IS_SUPPORTED,
  PARTICIPANT_LIMIT_IS_PRODUCT_RULE,
  PARTICIPANT_LIMIT_REQUALIFICATION_RECORDED,
  PARTICIPANT_PRODUCT_CARDINALITY,
  PRODUCT_ROUND_ROBIN_MEETINGS_PER_OPPONENT,
  ROUND_ROBIN_EXTENSION_REQUIRED,
  SMART_TOURNAMENT_GENERATOR,
  TOURNAMENT_BREAK_CARDINALITY,
  TOURNAMENT_PHASE_CARDINALITY,
  TOURNAMENT_PITCH_CARDINALITY,
} from "../smart-generator-architecture";

describe("SCE Smart Tournament Generator — 01D-R2 contracts", () => {
  it("records canonical product flags and cardinalities", () => {
    expect(SMART_TOURNAMENT_GENERATOR).toBe("CANONICAL");
    expect(AUTOMATIC_GENERATION_IS_PRIMARY).toBe(true);
    expect(MANUAL_ADJUSTMENT_IS_SUPPORTED).toBe(true);
    expect(PARTICIPANT_PRODUCT_CARDINALITY).toBe("2:n");
    expect(TOURNAMENT_PITCH_CARDINALITY).toBe("1:n");
    expect(TOURNAMENT_BREAK_CARDINALITY).toBe("0:n");
    expect(TOURNAMENT_PHASE_CARDINALITY).toBe("1:n");
  });

  it("records competition modes and group/mix generators", () => {
    expect(COMPETITION_MODES).toEqual([
      "GROUP_MIX_ONLY",
      "KNOCKOUT_ONLY",
      "GROUP_PLUS_KNOCKOUT",
    ]);
    expect(GROUP_MIX_GENERATORS).toEqual(["ROUND_ROBIN", "SMART_MIX"]);
  });

  it("records round-robin extension and MVP participant guard", () => {
    expect(CURRENT_ROUND_ROBIN_MEETINGS_PER_OPPONENT).toBe(1);
    expect(PRODUCT_ROUND_ROBIN_MEETINGS_PER_OPPONENT).toBe("1:n");
    expect(ROUND_ROBIN_EXTENSION_REQUIRED).toBe(true);
    expect(CURRENT_MVP_PARTICIPANT_LIMIT).toBe(16);
    expect(PARTICIPANT_LIMIT_IS_PRODUCT_RULE).toBe(false);
    expect(PARTICIPANT_LIMIT_REQUALIFICATION_RECORDED).toBe(true);
  });

  it("records home/away and qualification architecture flags", () => {
    expect(HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT).toBe("OFF");
    expect(FUTURE_KNOCKOUT_QUALIFICATION_MODEL_DEFINED).toBe(true);
    expect(FEASIBILITY_REQUIRES_ROUND_ROBIN_SOURCE).toBe(false);
  });

  it("binds the generation pipeline order", () => {
    expect(GENERATION_PIPELINE_STAGES).toContain("FEASIBILITY_01D");
    expect(GENERATION_PIPELINE_STAGES.indexOf("FIXTURE_GENERATOR")).toBeLessThan(
      GENERATION_PIPELINE_STAGES.indexOf("FEASIBILITY_01D"),
    );
    expect(GENERATION_PIPELINE_STAGES.indexOf("FEASIBILITY_01D")).toBeLessThan(
      GENERATION_PIPELINE_STAGES.indexOf("SCHEDULE_OPTIMISER_01E"),
    );
  });

  it("accepts a non-round-robin fixture set in feasibility (smart-mix shaped)", () => {
    const window = { startUtcMs: 0, endUtcMs: 6 * 60 * 60_000 };
    const result = analyseTournamentFeasibility({
      tournamentWindow: window,
      config: { matchDurationMinutes: 20, transitionMinutes: 5, minRestMinutes: 0 },
      participants: [{ participantId: "p1" }, { participantId: "p2" }, { participantId: "p3" }],
      fixtures: [
        {
          fixtureId: "mix-1",
          stageKey: "MIX",
          roundIndex: 0,
          slotIndexInRound: 0,
          sideAParticipantId: "p1",
          sideBParticipantId: "p2",
        },
        {
          fixtureId: "mix-2",
          stageKey: "MIX",
          roundIndex: 1,
          slotIndexInRound: 0,
          sideAParticipantId: "p1",
          sideBParticipantId: "p3",
        },
        {
          fixtureId: "mix-3",
          stageKey: "MIX",
          roundIndex: 2,
          slotIndexInRound: 0,
          sideAParticipantId: "p2",
          sideBParticipantId: "p3",
        },
      ],
      tournamentPitches: [
        {
          tournamentPitchId: "pitch-a",
          label: "Feld 1",
          displayOrder: 0,
          playableIntervals: [window],
        },
      ],
      breaks: [],
    });
    expect(result.status).not.toBe("INFEASIBLE");
  });
});
