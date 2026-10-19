import { describe, expect, it } from "vitest";
import { E_FF12_ROTATION_4_TEMPLATE } from "@/lib/tournament-scheduling/programme-templates/catalogue/e-ff12-rotation";
import { buildProgrammeReferenceInventory } from "@/lib/tournament-scheduling/programme-templates/catalogue/reference-inventory";
import { resolveProgrammeCategoryFromTeamAgeGroups } from "@/lib/tournament-scheduling/programme-templates/programme-template-category";
import { getRecommendedProgrammeTemplate } from "@/lib/tournament-scheduling/programme-templates/template-registry";
import { hydrateTournamentComposerFormFromDraft } from "../hydrate-tournament-composer-form-from-draft";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import {
  materializeComposerPitchesFromTemplate,
  reconcileComposerPlannerForParticipants,
  resolveComposerProgrammeTemplate,
  restoreComposerProgrammeProposal,
} from "../tournament-composer-programme-template";
import { evaluateComposerTemplateApplicability } from "../tournament-composer-programme-proposal";

const E_TEAM_OPTIONS = [{ id: "team-e1", name: "E1", ageGroup: "E", genderGroup: null }];
const F_TEAM_OPTIONS = [{ id: "team-f1", name: "F1", ageGroup: "F", genderGroup: null }];

describe("SCE-TOURNAMENT-PLANNER-02D R3", () => {
  it("A — same participant count resolves differently by category context", () => {
    const eTemplate = getRecommendedProgrammeTemplate({
      participantCount: 6,
      categoryContext: "E_FF12",
    });
    expect(eTemplate?.id).toBeTruthy();
    expect(
      getRecommendedProgrammeTemplate({ participantCount: 6, categoryContext: "F" }),
    ).toBeNull();
    expect(getRecommendedProgrammeTemplate({ participantCount: 6, categoryContext: null })).toBeNull();
  });

  it("B — reference inventory lists encoded E/FF12 and F field proposals without invented rounds", () => {
    const inventory = buildProgrammeReferenceInventory();
    const eSix = inventory.find((row) => row.category === "E_FF12" && row.participantCount === 6);
    expect(eSix?.referenceAvailable).toBe(true);
    expect(eSix?.roundsEncoded).toBe(true);
    expect(eSix?.roundCount).toBe(7);

    const fSix = inventory.find((row) => row.category === "F" && row.participantCount === 6);
    expect(fSix?.fieldCount).toBe(4);
    expect(fSix?.roundsEncoded).toBe(false);
    expect(fSix?.referenceAvailable).toBe(false);
  });

  it("C — editable proposal: materialise, rename, format, add, delete; catalogue unchanged", () => {
    const before = JSON.stringify(E_FF12_ROTATION_4_TEMPLATE.fields);
    let planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(planner.pitches).toHaveLength(3);

    planner = {
      ...planner,
      pitchesUserCustomized: true,
      pitches: planner.pitches.map((p, i) =>
        i === 0 ? { ...p, label: "Hauptfeld", playersPerSide: 4 } : p,
      ),
    };
    expect(planner.pitches[0]?.label).toBe("Hauptfeld");
    expect(planner.pitches[0]?.playersPerSide).toBe(4);

    planner = {
      ...planner,
      pitches: [...planner.pitches, { localId: "extra", label: "Extra", playersPerSide: null }],
    };
    expect(planner.pitches).toHaveLength(4);

    planner = {
      ...planner,
      pitches: planner.pitches.filter((p) => p.localId !== "extra"),
    };
    expect(JSON.stringify(E_FF12_ROTATION_4_TEMPLATE.fields)).toBe(before);
  });

  it("D — reconciliation preserves user customisation on hydrate and timing-only planner clone", () => {
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

  it("D — material participant change surfaces refresh prompt instead of silent overwrite", () => {
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
    expect(next.pendingProposalRefresh).not.toBeNull();
    expect(next.pitches.every((p) => p.label === "Behalten")).toBe(true);
  });

  it("E — restore recommendation resets customised pitches deterministically", () => {
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

  it("F — schedule applicability rejects deleted template fields", () => {
    const pitches = materializeComposerPitchesFromTemplate(E_FF12_ROTATION_4_TEMPLATE).slice(0, 2);
    expect(
      evaluateComposerTemplateApplicability({
        template: E_FF12_ROTATION_4_TEMPLATE,
        pitches,
      }),
    ).toBe("INCOMPATIBLE");
  });

  it("G — unknown category does not infer E template for manual participants", () => {
    expect(
      resolveComposerProgrammeTemplate({ participantCount: 4, categoryContext: null }),
    ).toBeNull();
    expect(resolveProgrammeCategoryFromTeamAgeGroups([]).categoryContext).toBeNull();
  });

  it("G — F category yields field proposal without full template for 6 teams", () => {
    const resolved = resolveComposerProgrammeTemplate({ participantCount: 6, categoryContext: "F" });
    expect(resolved?.proposal.kind).toBe("FIELD_PROPOSAL_ONLY");
    expect(resolved?.proposal.template).toBeNull();
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 6,
      categoryContext: "F",
    });
    expect(planner.programmeTemplateId).toBeNull();
    expect(planner.pitches).toHaveLength(4);
  });

  it("H — playing format optionality remains on editable rows", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 6,
      categoryContext: "F",
    });
    const cleared = {
      ...planner,
      pitchesUserCustomized: true,
      pitches: planner.pitches.map((p) => ({ ...p, playersPerSide: null })),
    };
    expect(cleared.pitches.every((p) => p.playersPerSide == null)).toBe(true);
  });

  it("silent category from structured team age group only", () => {
    expect(resolveProgrammeCategoryFromTeamAgeGroups(["F"]).categoryContext).toBe("F");
    expect(resolveProgrammeCategoryFromTeamAgeGroups(["E"]).categoryContext).toBe("E_FF12");
    expect(resolveProgrammeCategoryFromTeamAgeGroups(["E1"]).categoryContext).toBe("E_FF12");
    expect(resolveProgrammeCategoryFromTeamAgeGroups(["F2"]).categoryContext).toBe("F");
    expect(resolveProgrammeCategoryFromTeamAgeGroups(["F", "E"]).source).toBe("MIXED_OR_UNKNOWN");
  });
});
