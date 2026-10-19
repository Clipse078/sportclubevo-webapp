import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { E_FF12_ROTATION_4_TEMPLATE } from "@/lib/tournament-scheduling/programme-templates/catalogue/e-ff12-rotation";
import { G_CURATED_PARTICIPANT_COUNTS } from "@/lib/tournament-scheduling/programme-templates/catalogue/reference-inventory";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { hydrateTournamentComposerFormFromDraft } from "../hydrate-tournament-composer-form-from-draft";
import {
  buildComposerScheduleFitView,
  reconcileComposerPlannerForParticipants,
  resolveComposerProgrammeTemplate,
  restoreComposerProgrammeProposal,
} from "../tournament-composer-programme-template";
import {
  composerPitchDraftNeedsProposalMaterialisation,
  isGenericDefaultComposerPitchDraft,
  resolveComposerProgrammeProposal,
} from "../tournament-composer-programme-proposal";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const E_TEAM_OPTIONS = [{ id: "team-e1", name: "E1", ageGroup: "E", genderGroup: null }];
const F_TEAM_OPTIONS = [{ id: "team-f1", name: "F1", ageGroup: "F", genderGroup: null }];

describe("SCE-TOURNAMENT-PLANNER-02D R4 PO UAT", () => {
  it("regression — resolved proposal materialises pitches from generic Feld 1 default", () => {
    const proposal = resolveComposerProgrammeProposal({
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(proposal.kind).toBe("FULL_TEMPLATE");
    const defaultPlanner = createDefaultTournamentComposerPlannerDraft();
    expect(isGenericDefaultComposerPitchDraft(defaultPlanner.pitches)).toBe(true);
    expect(
      composerPitchDraftNeedsProposalMaterialisation({
        proposal,
        pitches: defaultPlanner.pitches,
      }),
    ).toBe(true);

    const planner = reconcileComposerPlannerForParticipants({
      planner: defaultPlanner,
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(planner.pitches.length).toBeGreaterThan(1);
    expect(planner.pitches.map((p) => p.playersPerSide)).toEqual([3, 3, 6]);
    expect(planner.pitchesUserCustomized).toBe(false);
  });

  it("regression — stale customised flag with generic default still materialises", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: {
        ...createDefaultTournamentComposerPlannerDraft(),
        pitchesUserCustomized: true,
      },
      participantCount: 6,
      categoryContext: "F",
    });
    expect(planner.pitches).toHaveLength(4);
    expect(planner.pitches.every((p) => p.playersPerSide != null)).toBe(true);
    expect(planner.pitchesUserCustomized).toBe(false);
  });

  it("field-only and full template proposals both materialise pitches", () => {
    const full = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(full.programmeTemplateId).toBe(E_FF12_ROTATION_4_TEMPLATE.id);
    expect(full.pitches.length).toBe(3);

    const fieldOnly = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 6,
      categoryContext: "F",
    });
    expect(fieldOnly.programmeTemplateId).toBeNull();
    expect(fieldOnly.pitches.length).toBe(4);
  });

  it("no proposal keeps manual generic workflow", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 17,
      categoryContext: "E_FF12",
    });
    expect(resolveComposerProgrammeTemplate({ participantCount: 17, categoryContext: "E_FF12" })).toBeNull();
    expect(planner.pitches).toHaveLength(1);
    expect(planner.pitches[0]?.playersPerSide).toBeNull();
  });

  it("user override preservation across hydrate, navigation clone, and timing change", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.participants = Array.from({ length: 4 }, (_, i) => ({
      localId: `p${i}`,
      kind: "TEAM" as const,
      teamId: "team-e1",
      displayName: `T${i + 1}`,
      subLabel: null,
      dressingRooms: [],
    }));
    draft.planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    draft.planner!.pitchesUserCustomized = true;
    draft.planner!.pitches[0] = { ...draft.planner!.pitches[0]!, label: "Custom", playersPerSide: 4 };

    const hydrated = hydrateTournamentComposerFormFromDraft(draft, { teamOptions: E_TEAM_OPTIONS });
    expect(hydrated.planner!.pitches[0]?.label).toBe("Custom");

    const timingOnly = reconcileComposerPlannerForParticipants({
      planner: {
        ...hydrated.planner!,
        timing: { ...hydrated.planner!.timing, matchDurationMinutes: 15 },
      },
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(timingOnly.pitches[0]?.label).toBe("Custom");
  });

  it("material participant change surfaces refresh prompt with updated copy", () => {
    let planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    planner = {
      ...planner,
      pitchesUserCustomized: true,
      pitches: planner.pitches.map((p) => ({ ...p, label: "Behalten" })),
    };
    const next = reconcileComposerPlannerForParticipants({
      planner,
      participantCount: 5,
      categoryContext: "E_FF12",
    });
    expect(next.pendingProposalRefresh?.message).toMatch(/Die Teams haben sich geändert/);
    expect(next.pitches.every((p) => p.label === "Behalten")).toBe(true);
  });

  it("restore recommendation rematerialises current proposal", () => {
    const customised = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    const restored = restoreComposerProgrammeProposal({
      planner: {
        ...customised,
        pitchesUserCustomized: true,
        pitches: [{ localId: "x", label: "X", playersPerSide: 9 }],
      },
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(restored.pitchesUserCustomized).toBe(false);
    expect(restored.pitches.map((p) => p.playersPerSide)).toEqual([3, 3, 6]);
  });

  it("Turnierformat curated path hides redundant controls until advanced open", () => {
    const panels = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    const legacy = read("components/admin/tournamentcenter/composer/TournamentComposerLegacyTurnierformatPanel.tsx");
    expect(panels).toMatch(/tournament-composer-advanced-format-toggle/);
    expect(panels).toMatch(/hideRoundRobinMeetings/);
    expect(panels).toMatch(/hideHomeAwayRelevance/);
    expect(legacy).toMatch(/hideRoundRobinMeetings/);
    expect(legacy).toMatch(/hideHomeAwayRelevance/);
  });

  it("Spielplan fit messaging avoids TP01 fallback copy for field proposals", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 6,
      categoryContext: "F",
    });
    const view = buildComposerScheduleFitView({
      participantCount: 6,
      categoryContext: "F",
      startAt: "2026-06-01T10:00",
      endAt: "2026-06-01T12:00",
      planner,
    });
    expect(view.headline).toMatch(/Feldaufteilung/);
    expect(view.headline).not.toMatch(/TP01/i);

    const panels = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    expect(panels).not.toMatch(/TP01-Fallback/);
  });

  it("G support inventory — no approved G reference files encoded in repo", () => {
    expect(G_CURATED_PARTICIPANT_COUNTS).toEqual([]);
  });
});
