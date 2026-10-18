import { describe, expect, it } from "vitest";
import { buildTournamentPlanungViewModel } from "../build-planung-view-model";
import type { PlanungDomainSnapshot } from "../build-planung-view-model";

const TZ = "Europe/Zurich";

function snapshot(partial: Partial<PlanungDomainSnapshot>): PlanungDomainSnapshot {
  return {
    tournamentId: "t1",
    ownership: "TENANT_ORGANISED",
    timezone: TZ,
    windowStartUtc: "2026-08-01T08:00:00.000Z",
    windowEndUtc: "2026-08-01T12:00:00.000Z",
    scheduleVersionId: "sv1",
    scheduleRevision: 1,
    schedulingConfig: {
      matchDurationMinutes: 20,
      transitionMinutes: 5,
      minRestMinutes: 10,
    },
    pitches: [
      { id: "p1", displayOrder: 0, label: "Feld 1" },
      { id: "p2", displayOrder: 1, label: "Feld 2" },
    ],
    breaks: [],
    fixtures: [
      {
        id: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        tournamentGroupId: "g1",
        phaseType: "GROUP_MIX",
        sideAParticipantId: "a",
        sideBParticipantId: "b",
        sides: [],
        phaseLabel: "Gruppe",
        groupLabel: "Gruppe A",
      },
    ],
    assignments: [
      {
        id: "as1",
        fixtureId: "f1",
        tournamentPitchId: "p1",
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: "2026-08-01T08:20:00.000Z",
        scheduleLockDimension: "TIME",
      },
    ],
    participants: [
      {
        participantId: "a",
        displayName: "FCA F2 Rot",
        crestUrl: null,
        accessibleLabel: "FCA F2 Rot",
      },
      {
        participantId: "b",
        displayName: "FCA F2 Blau",
        crestUrl: null,
        accessibleLabel: "FCA F2 Blau",
      },
    ],
    participantCount: 2,
    fixtureCount: 1,
    feasibility: { status: "FEASIBLE", diagnostics: [], metrics: {} as never, suggestions: [] },
    smartTiming: null,
    optimisation: { status: "FEASIBLE_NOT_PROVEN_OPTIMAL" } as never,
    fixtureResults: [],
    groups: [],
    rankingConfiguration: {
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"],
    },
    scheduleConsistencyStatus: "MATCHES",
    ...partial,
  };
}

describe("buildTournamentPlanungViewModel", () => {
  it("preserves distinct tournament-local participant identities", () => {
    const vm = buildTournamentPlanungViewModel(snapshot({}));
    const fixture = vm.cells.find((c) => c.kind === "FIXTURE");
    expect(fixture && fixture.kind === "FIXTURE").toBe(true);
    if (fixture?.kind === "FIXTURE") {
      expect(fixture.sideA.label).toBe("FCA F2 Rot");
      expect(fixture.sideB.label).toBe("FCA F2 Blau");
    }
  });

  it("renders qualification placeholders human-readably", () => {
    const vm = buildTournamentPlanungViewModel(
      snapshot({
        fixtures: [
          {
            id: "f-ko",
            stageKey: "KO",
            roundIndex: 1,
            slotIndexInRound: 0,
            tournamentGroupId: null,
            phaseType: "KNOCKOUT",
            sideAParticipantId: null,
            sideBParticipantId: null,
            phaseLabel: "K.o.",
            groupLabel: null,
            sides: [
              {
                side: "A",
                sourceType: "QUALIFICATION_REFERENCE",
                participantId: null,
                qualification: {
                  sourceType: "GROUP_RANK",
                  rank: 1,
                  sourceGroupLabel: "Gruppe A",
                  sourceFixture: null,
                },
              },
              {
                side: "B",
                sourceType: "QUALIFICATION_REFERENCE",
                participantId: null,
                qualification: {
                  sourceType: "GROUP_RANK",
                  rank: 2,
                  sourceGroupLabel: "Gruppe B",
                  sourceFixture: null,
                },
              },
            ],
          },
        ],
        assignments: [],
      }),
    );
    const cell = vm.cells.find((c) => c.kind === "FIXTURE");
    expect(cell && cell.kind === "FIXTURE").toBe(true);
    if (cell?.kind === "FIXTURE") {
      expect(cell.sideA.label).toBe("1. Gruppe A");
      expect(cell.sideB.label).toBe("2. Gruppe B");
    }
  });

  it("uses non-hardcoded time scale from assignment starts", () => {
    const vm = buildTournamentPlanungViewModel(snapshot({}));
    expect(vm.timeScale?.matchDurationMinutes).toBe(20);
    expect(vm.timeScale?.transitionMinutes).toBe(5);
    expect(vm.timeScale?.rowAnchorsUtc).toContain("2026-08-01T08:00:00.000Z");
  });

  it("mobile timeline shares planner model cells", () => {
    const vm = buildTournamentPlanungViewModel(snapshot({}));
    expect(vm.mobileTimeline.length).toBeGreaterThan(0);
    expect(vm.mobileTimeline[0]?.kind).toBe("FIXTURE");
  });

  it("does not surface raw feasibility codes as primary diagnostics", () => {
    const vm = buildTournamentPlanungViewModel(
      snapshot({
        assignments: [],
        optimisation: null,
        feasibility: {
          status: "INFEASIBLE",
          diagnostics: [{ code: "CAPACITY.PITCH_MINUTES_SHORT" }],
          metrics: {} as never,
          suggestions: [
            { code: "REDUCE_MATCH_DURATION" },
            { code: "ADD_TOURNAMENT_PITCH" },
          ],
        },
      }),
    );
    expect(vm.diagnostics).toHaveLength(0);
    expect(vm.diagnostics.every((d) => !d.message.includes("CAPACITY"))).toBe(true);
    expect(vm.planningUx?.state).toBe("STRUCTURAL_CHANGE");
    expect(vm.feasibilityGuidance?.state).toBe("STRUCTURAL_CHANGE");
    expect(vm.smartTiming).toBeNull();
  });

  it("embeds canonical smart timing recommendation in guidance when infeasible", () => {
    const vm = buildTournamentPlanungViewModel(
      snapshot({
        assignments: [],
        optimisation: null,
        schedulingConfig: {
          matchDurationMinutes: 30,
          transitionMinutes: 5,
          minRestMinutes: 0,
        },
        feasibility: {
          status: "INFEASIBLE",
          diagnostics: [{ code: "CAPACITY.WINDOW_TOO_SHORT" }],
          metrics: {} as never,
          suggestions: [
            { code: "REDUCE_MATCH_DURATION" },
            { code: "REDUCE_TRANSITION_DURATION" },
            { code: "ADD_TOURNAMENT_PITCH" },
          ],
        },
        smartTiming: {
          mode: "FIXED_ASSESSMENT",
          feasibilityStatus: "INFEASIBLE",
          participantRestProofStatus: "PROVEN",
          metrics: {} as never,
          effectivePlayableCapacityMinutes: 30,
          requiredSpanMinutes: 60,
          requiredSpanKind: "STRUCTURAL_LOWER_BOUND",
          predictedFinishUtcMs: null,
          reserveMinutes: null,
          durationRecommendation: {
            matchDurationMinutes: 12,
            transitionMinutes: 3,
            rationale: "internal only",
          },
          mathematicalMaximumTiming: null,
          recommendationsAutoApplied: false,
          adjustments: [],
          nudges: [],
          pitchCountRecommendation: {
            minimumProvenPitchCount: null,
            currentPitchCount: 2,
            rationale: "No pitch count up to MVP limit produced a feasible witness schedule.",
          },
          matchDurationOpportunity: null,
          breakOpportunity: null,
          diagnostics: [],
        },
      }),
    );
    expect(vm.feasibilityGuidance?.recommendedTiming).toEqual({
      matchDurationMinutes: 12,
      transitionMinutes: 3,
    });
    expect(vm.planningUx?.state).toBe("AUTO_FIX");
    expect(vm.diagnostics).toHaveLength(0);
    expect(vm.smartTiming).toBeNull();
  });
});
