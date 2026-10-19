import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyseTournamentFeasibility } from "@/lib/tournament-scheduling/feasibility";
import { assessTournamentTiming } from "@/lib/tournament-scheduling/smart-timing";
import { buildTournamentPlanungViewModel } from "../build-planung-view-model";
import type { PlanungDomainSnapshot } from "../build-planung-view-model";
import {
  buildPlanungInfeasiblePlanningUx,
  buildPlanungPlanningUx,
  feasibilityDiagnosticUserMessage,
  resolveInitialScheduleGenerationOutcome,
} from "../planung-presentation";

function baseSnapshot(partial: Partial<PlanungDomainSnapshot>): PlanungDomainSnapshot {
  return {
    tournamentId: "t1",
    ownership: "TENANT_ORGANISED",
    timezone: "Europe/Zurich",
    windowStartUtc: "2026-08-01T08:00:00.000Z",
    windowEndUtc: "2026-08-01T12:00:00.000Z",
    scheduleVersionId: null,
    scheduleRevision: null,
    schedulingConfig: {
      matchDurationMinutes: 30,
      transitionMinutes: 5,
      minRestMinutes: 10,
    },
    pitches: [{ id: "p1", displayOrder: 0, label: "Feld 1" }],
    breaks: [],
    fixtures: [
      {
        id: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        tournamentGroupId: null,
        phaseType: "GROUP_MIX",
        sideAParticipantId: "a",
        sideBParticipantId: "b",
        sides: [],
        phaseLabel: null,
        groupLabel: null,
      },
    ],
    assignments: [],
    participants: [],
    participantCount: 4,
    fixtureCount: 1,
    feasibility: { status: "FEASIBLE", diagnostics: [], metrics: {} as never, suggestions: [] },
    smartTiming: null,
    optimisation: null,
    fixtureResults: [],
    groups: [],
    rankingConfiguration: {
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      tiebreakOrder: ["POINTS"],
    },
    scheduleConsistencyStatus: null,
    fixtureHomeAwayRelevance: "OFF",
    ...partial,
  };
}

describe("01K-R4 — simplified Planung UX", () => {
  it("READY state when feasible and no schedule yet", () => {
    const vm = buildTournamentPlanungViewModel(
      baseSnapshot({ participantCount: 9 }),
    );
    expect(vm.planningUx?.state).toBe("READY");
    expect(vm.planningUx?.headline).toBe("Alles bereit.");
    expect(vm.actions.generateLabel).toBe("✨ Spielplan erstellen");
    expect(vm.actions.canGenerate).toBe(true);
    expect(vm.programmeTemplate?.available).toBe(false);
    expect(vm.diagnostics).toHaveLength(0);
    expect(vm.feasibilityGuidance).toBeNull();
  });

  it("offers predefined template fast path when participant count matches catalogue", () => {
    const vm = buildTournamentPlanungViewModel(
      baseSnapshot({ participantCount: 4, programmeCategoryContext: "E_FF12" }),
    );
    expect(vm.programmeTemplate?.available).toBe(true);
    expect(vm.actions.canInstantiatePredefinedTemplate).toBe(true);
    expect(vm.actions.canGenerate).toBe(false);
  });

  it("does not expose raw diagnostic codes or minimum-rest copy in planning UX", () => {
    const vm = buildTournamentPlanungViewModel(
      baseSnapshot({
        feasibility: {
          status: "INFEASIBLE",
          diagnostics: [{ code: "REST.CANNOT_SATISFY_MIN_REST" }],
          metrics: {} as never,
          suggestions: [{ code: "REDUCE_MINIMUM_REST" }, { code: "ADD_TOURNAMENT_PITCH" }],
        },
      }),
    );
    expect(vm.diagnostics).toHaveLength(0);
    expect(JSON.stringify(vm.planningUx)).not.toMatch(/REST\.|Erholungszeiten|Mindestpause/i);
    expect(vm.planningUx?.state).toBe("STRUCTURAL_CHANGE");
    expect(vm.planningUx?.contextLinks.length).toBeLessThanOrEqual(2);
  });

  it("AUTO_FIX uses canonical smart timing recommendation only", () => {
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
      tournamentPitches: [{ tournamentPitchId: "pitch-a", displayOrder: 0, label: "Feld 1" }],
      breaks: [],
    });
    const feasibility = analyseTournamentFeasibility({
      tournamentWindow: { startUtcMs: 0, endUtcMs: 120 * 60_000 },
      config: { matchDurationMinutes: 30, transitionMinutes: 5, minRestMinutes: 0 },
      fixtures,
      participants: Array.from({ length: 16 }, (_, i) => ({ participantId: `team-${i}` })),
      tournamentPitches: [
        {
          tournamentPitchId: "pitch-a",
          displayOrder: 0,
          label: "Feld 1",
          playableIntervals: [{ startUtcMs: 0, endUtcMs: 120 * 60_000 }],
        },
      ],
      breaks: [],
    });
    const ux = buildPlanungInfeasiblePlanningUx(
      feasibility,
      assessment,
      { matchDurationMinutes: 30, transitionMinutes: 5 },
      "t1",
    );
    expect(ux.state).toBe("AUTO_FIX");
    expect(ux.recommendedTiming).toEqual({
      matchDurationMinutes: assessment.durationRecommendation!.matchDurationMinutes,
      transitionMinutes: assessment.durationRecommendation!.transitionMinutes,
    });
    expect(ux.contextLinks).toHaveLength(0);
  });

  it("STRUCTURAL fallback has no generic five-item suggestion list", () => {
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
      participants: [
        { participantId: "p1" },
        { participantId: "p2" },
        { participantId: "p3" },
        { participantId: "p4" },
      ],
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
    const ux = buildPlanungInfeasiblePlanningUx(feasibility, null, {
      matchDurationMinutes: 30,
      transitionMinutes: 5,
    });
    expect(ux.state).toBe("STRUCTURAL_CHANGE");
    expect(ux.summary).toMatch(/mehr Zeit oder ein zusätzliches Spielfeld/i);
    expect(JSON.stringify(ux)).not.toContain("Spieldauer verkürzen");
  });

  it("failed generation outcome does not auto-generate and reuses canonical guidance", () => {
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
  });

  it("hides planning UX once schedule exists", () => {
    const vm = buildTournamentPlanungViewModel(
      baseSnapshot({
        scheduleVersionId: "sv1",
        scheduleRevision: 1,
        assignments: [
          {
            id: "a1",
            fixtureId: "f1",
            tournamentPitchId: "p1",
            startAt: "2026-08-01T08:00:00.000Z",
            endAt: "2026-08-01T08:30:00.000Z",
            scheduleLockDimension: null,
          },
        ],
      }),
    );
    expect(vm.planningUx).toBeNull();
  });

  it("buildPlanungPlanningUx is shared truth entry for Creator parity", () => {
    const workspace = readFileSync(
      join(process.cwd(), "components/admin/tournamentcenter/planung/TournamentPlanungWorkspace.tsx"),
      "utf8",
    );
    const composer = readFileSync(
      join(process.cwd(), "lib/tournaments/composer/tournament-composer-smart-timing.ts"),
      "utf8",
    );
    expect(workspace).toMatch(/buildPlanungPlanningUx|planningUx/);
    expect(composer).toMatch(/buildComposerPlanningAssistantUx/);
    expect(feasibilityDiagnosticUserMessage("CAPACITY.PITCH_MINUTES_SHORT")).not.toContain("_");
  });
});
