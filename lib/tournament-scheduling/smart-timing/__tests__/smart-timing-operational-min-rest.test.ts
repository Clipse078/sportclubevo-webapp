import { describe, expect, it } from "vitest";
import { generateRoundRobinFixtures } from "../../fixtures/round-robin";
import { assessTournamentTiming } from "../assess";
import { recommendOperationalMinRestMinutes } from "../operational-min-rest";
import {
  BASE_MS,
  baseInput,
  participantsFromFixtures,
  tournamentPitch,
  windowFromClock,
} from "./helpers";

describe("Smart Timing — operational minimum rest (01H-R3)", () => {
  it("A — positive operational rest when capacity allows (4 teams, 4 pitches, 2h window)", () => {
    const participantIds = ["t1", "t2", "t3", "t4"];
    const fixtures = generateRoundRobinFixtures({
      participantIds,
      config: {
        format: "ROUND_ROBIN",
        stageKey: "MAIN",
        meetingsPerOpponent: 1,
        homeAwayRelevance: "OFF",
      },
    }).map((row) => ({
      fixtureId: row.generatorKey,
      stageKey: row.stageKey,
      roundIndex: row.roundIndex,
      slotIndexInRound: row.slotIndexInRound,
      sideAParticipantId: row.sideAParticipantId,
      sideBParticipantId: row.sideBParticipantId,
    }));

    const backward = assessTournamentTiming(
      baseInput({
        mode: "BACKWARD",
        fixtures,
        participants: participantsFromFixtures(fixtures),
        tournamentWindow: windowFromClock(0, 120),
        tournamentPitches: [
          tournamentPitch("p1", 0),
          tournamentPitch("p2", 1),
          tournamentPitch("p3", 2),
          tournamentPitch("p4", 3),
        ],
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
      }),
    );

    expect(backward.minRestRecommendation).not.toBeNull();
    expect(backward.minRestRecommendation!.mathematicalMinimumMinutes).toBe(0);
    expect(backward.minRestRecommendation!.minRestMinutes).toBeGreaterThan(0);
    expect(backward.minRestRecommendation!.kind).toBe("OPERATIONALLY_RECOMMENDED");
  });

  it("B — tight capacity may recommend zero operational rest", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "a",
        sideBParticipantId: "b",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "a",
        sideBParticipantId: "c",
      },
    ];

    const input = baseInput({
      mode: "FIXED_ASSESSMENT",
      fixtures,
      participants: participantsFromFixtures(fixtures),
      tournamentWindow: windowFromClock(0, 20),
      tournamentPitches: [tournamentPitch("p1", 0)],
      config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
    });

    const rest = recommendOperationalMinRestMinutes(input, 10, 0, "PROVEN");
    expect(rest.minRestMinutes).toBe(0);
    expect(rest.kind).toBe("MATHEMATICAL_BOUND");
  });

  it("C — user-configured zero is not mutated by assessment", () => {
    const fixtures = generateRoundRobinFixtures({
      participantIds: ["a", "b", "c", "d"],
      config: {
        format: "ROUND_ROBIN",
        stageKey: "MAIN",
        meetingsPerOpponent: 1,
        homeAwayRelevance: "OFF",
      },
    }).map((row) => ({
      fixtureId: row.generatorKey,
      stageKey: row.stageKey,
      roundIndex: row.roundIndex,
      slotIndexInRound: row.slotIndexInRound,
      sideAParticipantId: row.sideAParticipantId,
      sideBParticipantId: row.sideBParticipantId,
    }));
    const input = baseInput({
      mode: "FIXED_ASSESSMENT",
      fixtures,
      config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
    });
    const assessment = assessTournamentTiming(input);
    expect(assessment.recommendationsAutoApplied).toBe(false);
    expect(input.config.minRestMinutes).toBe(0);
  });

  it("D — break-aware rest recommendation remains feasible", () => {
    const fixtures = generateRoundRobinFixtures({
      participantIds: ["a", "b", "c", "d"],
      config: {
        format: "ROUND_ROBIN",
        stageKey: "MAIN",
        meetingsPerOpponent: 1,
        homeAwayRelevance: "OFF",
      },
    }).map((row) => ({
      fixtureId: row.generatorKey,
      stageKey: row.stageKey,
      roundIndex: row.roundIndex,
      slotIndexInRound: row.slotIndexInRound,
      sideAParticipantId: row.sideAParticipantId,
      sideBParticipantId: row.sideBParticipantId,
    }));

    const assessment = assessTournamentTiming(
      baseInput({
        mode: "BACKWARD",
        fixtures,
        participants: participantsFromFixtures(fixtures),
        tournamentWindow: windowFromClock(0, 120),
        tournamentPitches: [tournamentPitch("p1", 0), tournamentPitch("p2", 1)],
        breaks: [
          {
            breakId: "b1",
            startUtcMs: BASE_MS + 60 * 60_000,
            endUtcMs: BASE_MS + 75 * 60_000,
            scope: "ALL_PITCHES",
          },
        ],
      }),
    );
    expect(assessment.minRestRecommendation).not.toBeNull();
    expect(assessment.feasibilityStatus).not.toBe("INFEASIBLE");
  });

  it("F — deterministic repeated invocation", () => {
    const input = baseInput({ mode: "BACKWARD", fixtures: generateRoundRobinFixtures({
      participantIds: ["a", "b", "c", "d"],
      config: {
        format: "ROUND_ROBIN",
        stageKey: "MAIN",
        meetingsPerOpponent: 1,
        homeAwayRelevance: "OFF",
      },
    }).map((row) => ({
      fixtureId: row.generatorKey,
      stageKey: row.stageKey,
      roundIndex: row.roundIndex,
      slotIndexInRound: row.slotIndexInRound,
      sideAParticipantId: row.sideAParticipantId,
      sideBParticipantId: row.sideBParticipantId,
    })) });
    const a = assessTournamentTiming(input);
    const b = assessTournamentTiming(input);
    expect(a.minRestRecommendation).toEqual(b.minRestRecommendation);
  });
});
