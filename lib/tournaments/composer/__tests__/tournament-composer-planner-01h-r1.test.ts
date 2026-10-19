import { describe, expect, it, vi, beforeEach } from "vitest";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { validateHomePlannerDraft } from "../tournament-composer-planner-validation";
import { computeTournamentCreateTabErrors, firstInvalidTournamentCreateTab } from "@/lib/tournaments/tournament-create-validation";
import {
  resolveTournamentCreateStepValid,
  validateTournamentCreateWorkflowStep,
} from "@/lib/tournaments/tournament-create-step-validation";
import { buildTournamentCreateTabNavigationConfig } from "@/lib/tournaments/tournament-create-workflow-config";
import { isDuplicateTournamentParticipant } from "@/lib/tournaments/tournament-participant-presentation";
import { assessTournamentComposerSmartTiming } from "../tournament-composer-smart-timing";
import { buildTournamentPlanungViewModel } from "@/lib/tournaments/planung/build-planung-view-model";

vi.mock("@/lib/tournaments/composer/persist-tournament-planner-from-composer", () => ({
  persistTournamentPlannerFromComposer: vi.fn(),
}));

describe("01H-R1 — Tournament Creator planner configuration", () => {
  function homeDraft() {
    const base = createEmptyTournamentComposerDraft();
    base.homeAway = "HOME";
    base.seasonId = "season-1";
    base.title = "Test";
    base.startAt = "2026-06-01T09:00";
    base.endAt = "2026-06-01T15:00";
    base.participants = [
      {
        localId: "p1",
        kind: "TEAM",
        teamId: "t1",
        displayName: "Team A",
        subLabel: null,
        dressingRooms: [],
      },
      {
        localId: "p2",
        kind: "TEAM",
        teamId: "t2",
        displayName: "Team B",
        subLabel: null,
        dressingRooms: [],
      },
    ];
    base.planner = createDefaultTournamentComposerPlannerDraft({ defaultMatchDurationMinutes: 12 });
    base.planner.pitches[0]!.playersPerSide = 6;
    return base;
  }

  it("HOME tab navigation includes planner steps", () => {
    const config = buildTournamentCreateTabNavigationConfig({ homeAway: "HOME" });
    expect(config.tabs.map((t) => t.key)).toEqual([
      "termin",
      "teams",
      "turnierformat",
      "spielfelder",
      "spielplan",
      "ressourcen",
      "publikation",
      "uebersicht",
    ]);
  });

  it("AWAY tab navigation hides planner steps", () => {
    const config = buildTournamentCreateTabNavigationConfig({ homeAway: "AWAY" });
    expect(config.tabs.map((t) => t.key)).toEqual([
      "termin",
      "teams",
      "ressourcen",
      "publikation",
      "uebersicht",
    ]);
  });

  it("allows duplicate source team participants", () => {
    expect(
      isDuplicateTournamentParticipant([], { kind: "TEAM", teamId: "same" }),
    ).toBe(false);
  });

  it("validates minimum pitches and participants for HOME", () => {
    const draft = homeDraft();
    draft.planner!.pitches = [];
    expect(Object.keys(validateHomePlannerDraft(draft))).toContain("pitches");
  });

  it("smart timing advisor returns assessment for HOME draft", () => {
    const assessment = assessTournamentComposerSmartTiming(homeDraft());
    expect(assessment).not.toBeNull();
    expect(assessment!.mode).toBeDefined();
  });

  it("guided step valid respects optional planner steps", () => {
    const draft = homeDraft();
    expect(resolveTournamentCreateStepValid(draft, "turnierformat")).toBe(true);
    expect(validateTournamentCreateWorkflowStep(draft, "spielplan").valid).toBe(true);
  });

  it("whole-form tab errors surface planner issues", () => {
    const draft = homeDraft();
    draft.planner!.timing.matchDurationMinutes = 0;
    const errors = computeTournamentCreateTabErrors(draft);
    expect(errors.spielplan || errors.spielfelder || errors.turnierformat).toBe(true);
    expect(firstInvalidTournamentCreateTab(errors, "HOME")).toBeTruthy();
  });

  it("AWAY draft has no planner configuration surface in tab order", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "AWAY";
    expect(draft.planner ?? null).toBeNull();
    expect(buildTournamentCreateTabNavigationConfig({ homeAway: "AWAY" }).tabs.some((t) => t.key === "turnierformat")).toBe(
      false,
    );
  });

  it("legacy planung incomplete setup shows actionable planner setup", () => {
    const vm = buildTournamentPlanungViewModel({
      tournamentId: "t1",
      ownership: "TENANT_ORGANISED",
      timezone: "Europe/Zurich",
      windowStartUtc: new Date().toISOString(),
      windowEndUtc: new Date().toISOString(),
      scheduleVersionId: null,
      scheduleRevision: null,
      schedulingConfig: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
      pitches: [],
      breaks: [],
      fixtures: [],
      assignments: [],
      participants: [],
      participantCount: 2,
      fixtureCount: 0,
      feasibility: null,
      smartTiming: null,
      optimisation: null,
      fixtureResults: [],
      groups: [],
      rankingConfiguration: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"],
      },
      scheduleConsistencyStatus: null,
      fixtureHomeAwayRelevance: "OFF",
    });
    expect(vm.incompleteSetup.some((i) => i.code === "PLANNER_SETUP")).toBe(true);
  });
});
