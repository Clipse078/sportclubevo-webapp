import { describe, expect, it } from "vitest";
import { createDefaultTournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-defaults";
import type { TournamentComposerPitchDraft } from "@/lib/tournaments/composer/tournament-composer-planner-types";
import { resolveComposerProgrammeTemplate } from "@/lib/tournaments/composer/tournament-composer-programme-template";
import { applyRecommendedPlannerPitchDraftPreparation } from "../prepare-recommended-planner-pitch-drafts";

describe("applyRecommendedPlannerPitchDraftPreparation (DS-06-R2)", () => {
  it("recommendation for 4 E teams materialises three logical Feld drafts from canonical proposal", () => {
    const resolved = resolveComposerProgrammeTemplate({
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(resolved?.proposedFieldCount).toBe(3);

    const planner = applyRecommendedPlannerPitchDraftPreparation({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
      persistedPitchCount: 0,
    });

    expect(planner.pitches).toHaveLength(3);
    expect(planner.pitches.map((p) => p.label)).toEqual(["Feld 1", "Feld 2", "Feld 3"]);
  });

  it("is idempotent on repeated preparation with zero persisted pitches", () => {
    const first = applyRecommendedPlannerPitchDraftPreparation({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
      persistedPitchCount: 0,
    });
    const second = applyRecommendedPlannerPitchDraftPreparation({
      planner: first,
      participantCount: 4,
      categoryContext: "E_FF12",
      persistedPitchCount: 0,
    });
    expect(second.pitches).toHaveLength(first.pitches.length);
    expect(second.pitches.map((p) => p.label)).toEqual(first.pitches.map((p) => p.label));
  });

  it("tops up safely when one persisted pitch exists but recommendation requires more", () => {
    const existing: TournamentComposerPitchDraft[] = [
      {
        localId: "db-pitch-1",
        label: "Hauptfeld",
        playersPerSide: null,
        userLabelCustomized: true,
      },
    ];
    const planner = applyRecommendedPlannerPitchDraftPreparation({
      planner: {
        ...createDefaultTournamentComposerPlannerDraft(),
        pitches: existing,
        pitchesUserCustomized: true,
      },
      participantCount: 4,
      categoryContext: "E_FF12",
      persistedPitchCount: 1,
    });

    expect(planner.pitches[0]?.label).toBe("Hauptfeld");
    expect(planner.pitches).toHaveLength(3);
    expect(planner.pitches[1]?.label).toBe("Feld 2");
  });

  it("keeps three existing pitches intact when recommendation also expects three", () => {
    const pitches: TournamentComposerPitchDraft[] = [
      { localId: "a", label: "Alpha", playersPerSide: null, userLabelCustomized: true },
      { localId: "b", label: "Beta", playersPerSide: null, userLabelCustomized: true },
      { localId: "c", label: "Gamma", playersPerSide: null, userLabelCustomized: true },
    ];
    const planner = applyRecommendedPlannerPitchDraftPreparation({
      planner: { ...createDefaultTournamentComposerPlannerDraft(), pitches, pitchesUserCustomized: true },
      participantCount: 4,
      categoryContext: "E_FF12",
      persistedPitchCount: 3,
    });
    expect(planner.pitches.map((p) => p.label)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("does not remove extra user-configured pitches above recommendation", () => {
    const pitches: TournamentComposerPitchDraft[] = Array.from({ length: 5 }, (_, i) => ({
      localId: `p-${i}`,
      label: `Custom ${i + 1}`,
      playersPerSide: null,
      userLabelCustomized: true,
    }));
    const planner = applyRecommendedPlannerPitchDraftPreparation({
      planner: { ...createDefaultTournamentComposerPlannerDraft(), pitches, pitchesUserCustomized: true },
      participantCount: 4,
      categoryContext: "E_FF12",
      persistedPitchCount: 5,
    });
    expect(planner.pitches).toHaveLength(5);
    expect(planner.pitches[0]?.label).toBe("Custom 1");
  });

  it("prepares multiple F-category field drafts without inventing facility assignments", () => {
    const planner = applyRecommendedPlannerPitchDraftPreparation({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 6,
      categoryContext: "F",
      persistedPitchCount: 0,
    });
    expect(planner.pitches.length).toBe(4);
    expect(planner.pitches.every((p) => p.playersPerSide == null)).toBe(true);
  });

  it("DS-06-R3 — newly prepared pitches never inherit playersPerSide from recommendation", () => {
    const planner = applyRecommendedPlannerPitchDraftPreparation({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
      persistedPitchCount: 0,
    });
    expect(planner.pitches.every((p) => p.playersPerSide == null)).toBe(true);
  });

  it("DS-06-R3 — user-configured 11v11 on existing pitch is preserved", () => {
    const pitches: TournamentComposerPitchDraft[] = [
      {
        localId: "db-1",
        label: "Feld 1",
        playersPerSide: 11,
        userLabelCustomized: false,
      },
    ];
    const planner = applyRecommendedPlannerPitchDraftPreparation({
      planner: { ...createDefaultTournamentComposerPlannerDraft(), pitches, pitchesUserCustomized: true },
      participantCount: 4,
      categoryContext: "E_FF12",
      persistedPitchCount: 1,
    });
    expect(planner.pitches[0]?.playersPerSide).toBe(11);
  });
});
