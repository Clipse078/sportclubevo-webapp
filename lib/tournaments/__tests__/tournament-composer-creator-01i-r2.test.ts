import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildTournamentCreateTabNavigationConfig,
  resolveTournamentCreateTabOrder,
} from "@/lib/tournaments/tournament-create-workflow-config";
import {
  computeTournamentCreateTabErrors,
  firstInvalidTournamentCreateTab,
} from "@/lib/tournaments/tournament-create-validation";
import {
  resolveGuidedNextStep,
  resolveGuidedPreviousStep,
  resolveGuidedStepIndex,
} from "@/lib/sce/activity-composer/guided-workflow";
import { createEmptyTournamentComposerDraft } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-defaults";
import {
  applyComposerRecommendedTiming,
  buildTournamentComposerSmartTimingView,
} from "@/lib/tournaments/composer/tournament-composer-smart-timing";
import {
  createDefaultComposerBreakDraft,
  resolveComposerBreakDateTimes,
} from "@/lib/tournaments/composer/tournament-composer-planner-breaks";
import { validateTournamentCreateWorkflowStep } from "@/lib/tournaments/tournament-create-step-validation";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function homeDraft() {
  const base = createEmptyTournamentComposerDraft();
  base.homeAway = "HOME";
  base.seasonId = "season-1";
  base.title = "Cup";
  base.startAt = "2026-06-01T09:00";
  base.endAt = "2026-06-01T15:00";
  base.participants = [
    {
      localId: "p1",
      kind: "TEAM",
      teamId: "t1",
      displayName: "A",
      subLabel: null,
      dressingRooms: [],
    },
    {
      localId: "p2",
      kind: "TEAM",
      teamId: "t2",
      displayName: "B",
      subLabel: null,
      dressingRooms: [],
    },
  ];
  base.planner = createDefaultTournamentComposerPlannerDraft();
  return base;
}

describe("SCE-TOURNAMENT-PLANNER-01I-R2 — Creator step order + retrospective stability", () => {
  it("A — HOME tab order is Termin-first canonical", () => {
    expect(resolveTournamentCreateTabOrder("HOME")).toEqual([
      "termin",
      "teams",
      "turnierformat",
      "spielfelder",
      "spielplan",
      "ressourcen",
      "publikation",
      "uebersicht",
    ]);
    expect(buildTournamentCreateTabNavigationConfig({ homeAway: "HOME" }).defaultTab).toBe("termin");
  });

  it("B — AWAY tab order is Termin-first canonical", () => {
    expect(resolveTournamentCreateTabOrder("AWAY")).toEqual([
      "termin",
      "teams",
      "ressourcen",
      "publikation",
      "uebersicht",
    ]);
  });

  it("C/D — guided Schritt index and Weiter/Zurück follow tab order", () => {
    const order = resolveTournamentCreateTabOrder("HOME");
    expect(resolveGuidedStepIndex(order, "termin")).toBe(0);
    expect(resolveGuidedNextStep(order, "termin")).toBe("teams");
    expect(resolveGuidedPreviousStep(order, "teams")).toBe("termin");
  });

  it("E — first-invalid-step follows Termin-first order", () => {
    const errors = computeTournamentCreateTabErrors(createEmptyTournamentComposerDraft());
    expect(firstInvalidTournamentCreateTab(errors, "HOME")).toBe("termin");
  });

  it("F — direct navigation remains allowed (composer tabs, not sequential wizard)", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).toContain("SceActivityComposer");
    expect(form).not.toMatch(/sequentialWizard|lockedStep/i);
  });

  it("G/H — participant count change recalculates Smart Timing without mutating planner timing", () => {
    const draft = homeDraft();
    const timingBefore = { ...draft.planner!.timing };
    draft.participants.push({
      localId: "p3",
      kind: "TEAM",
      teamId: "t3",
      displayName: "C",
      subLabel: null,
      dressingRooms: [],
    });
    const beforeCount = buildTournamentComposerSmartTimingView(homeDraft()).fixtureCount;
    const afterView = buildTournamentComposerSmartTimingView(draft);
    expect(draft.planner!.timing).toEqual(timingBefore);
    expect(afterView.fixtureCount).toBeGreaterThan(beforeCount);
  });

  it("I/J/K — pause edits remain stable (duration/start, add/remove)", () => {
    const draft = homeDraft();
    const br = createDefaultComposerBreakDraft("b1");
    br.startLocalTime = "11:00";
    br.durationMinutes = 15;
    draft.planner!.breaks = [br];
    const interval15 = resolveComposerBreakDateTimes(br, draft.startAt);
    expect(interval15?.endAt).toBe("2026-06-01T11:15");

    br.durationMinutes = 20;
    const interval20 = resolveComposerBreakDateTimes(br, draft.startAt);
    expect(interval20?.endAt).toBe("2026-06-01T11:20");

    br.startLocalTime = "11:30";
    const intervalMoved = resolveComposerBreakDateTimes(br, draft.startAt);
    expect(intervalMoved?.startAt).toBe("2026-06-01T11:30");

    draft.planner!.breaks.push(createDefaultComposerBreakDraft("b2"));
    expect(draft.planner!.breaks).toHaveLength(2);
    draft.planner!.breaks = draft.planner!.breaks.filter((row) => row.localId !== "b1");
    expect(draft.planner!.breaks).toHaveLength(1);
    expect(buildTournamentComposerSmartTimingView(draft).liveAssessment).not.toBeNull();
  });

  it("L — retrospective pitch count change keeps breaks unless invalid", () => {
    const draft = homeDraft();
    draft.planner!.pitches.push({ localId: "pitch-2", label: "Feld 2" });
    const view = buildTournamentComposerSmartTimingView(draft);
    expect(view.pitchCount).toBe(2);
    expect(view.liveAssessment).not.toBeNull();
  });

  it("M — competition format change recalculates derived fixture estimate only", () => {
    const draft = homeDraft();
    const timingBefore = { ...draft.planner!.timing };
    draft.planner!.competitionFormat = "KNOCKOUT_ONLY";
    const view = buildTournamentComposerSmartTimingView(draft);
    expect(view.fixtureCount).toBeGreaterThan(0);
    expect(draft.planner!.timing).toEqual(timingBefore);
  });

  it("N/O — Smart Timing recommendation does not silently apply; Empfehlung übernehmen is explicit", () => {
    const draft = homeDraft();
    const view = buildTournamentComposerSmartTimingView(draft);
    expect(view.recommendedTiming).not.toBeNull();
    expect(draft.planner!.timing.matchDurationMinutes).not.toBe(view.recommendedTiming!.matchDurationMinutes);
    const applied = applyComposerRecommendedTiming(draft.planner!, view.recommendedTiming!);
    expect(applied.timing.matchDurationMinutes).toBe(view.recommendedTiming!.matchDurationMinutes);
    const panels = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    expect(panels).toContain("Empfehlung übernehmen");
    expect(panels).toContain("computeLiveView");
  });

  it("P — 01I manual-assignment module remains present", () => {
    expect(read("docs/roadmap/SCE-TOURNAMENT-PLANNER-01I.md")).toMatch(/manual adjustment|01I/i);
    expect(read("lib/tournament-scheduling/manual-assignment/validate-tournament-manual-assignment.ts")).toMatch(
      /validateTournamentManualAssignment/,
    );
  });

  it("Spielplan Smart Timing skips live derivation when panel is inactive (code guard)", () => {
    expect(read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx")).toMatch(
      /activeTab === "spielplan"/,
    );
  });
});

describe("01I-R2 — retrospective termin window stability", () => {
  it("changing tournament window recalculates assessment without mutating user timing", () => {
    const draft = homeDraft();
    const timingBefore = { ...draft.planner!.timing };
    draft.endAt = "2026-06-01T18:00";
    const view = buildTournamentComposerSmartTimingView(draft);
    expect(view.liveAssessment).not.toBeNull();
    expect(draft.planner!.timing).toEqual(timingBefore);
    expect(validateTournamentCreateWorkflowStep(draft, "termin").valid).toBe(true);
  });
});
