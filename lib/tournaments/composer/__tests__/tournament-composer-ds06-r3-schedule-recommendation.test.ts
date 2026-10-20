import { describe, expect, it } from "vitest";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import {
  buildScheduleRecommendationSummary,
  resolveComposerProgrammeProposal,
} from "../tournament-composer-programme-proposal";
import {
  reconcileComposerPlannerForParticipants,
  resolveComposerProgrammeTemplate,
} from "../tournament-composer-programme-template";

describe("DS-06-R3 — schedule recommendation ≠ playing format", () => {
  it("A — 4 E teams: 3 pitches / 6 rounds recommendation without players-per-side", () => {
    const resolved = resolveComposerProgrammeTemplate({
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(resolved?.scheduleRecommendationSummary).toBe("3 Spielfelder · 6 Runden");
    expect(resolved?.scheduleRecommendationSummary).not.toMatch(/gegen|v6|3v3/i);

    const proposal = resolveComposerProgrammeProposal({
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(proposal.kind).toBe("FULL_TEMPLATE");
  });

  it("B — recommended 3 pitches materialise Feld 1–3 with unspecified playing format", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(planner.pitches.map((p) => p.label)).toEqual(["Feld 1", "Feld 2", "Feld 3"]);
    expect(planner.pitches.every((p) => p.playersPerSide == null)).toBe(true);
  });

  it("C — existing user 11v11 preserved across participant reconciliation", () => {
    let planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    planner = {
      ...planner,
      pitchesUserCustomized: true,
      pitches: planner.pitches.map((p, i) =>
        i === 0 ? { ...p, playersPerSide: 11 } : p,
      ),
    };
    const next = reconcileComposerPlannerForParticipants({
      planner,
      participantCount: 5,
      categoryContext: "E_FF12",
    });
    expect(next.pitches[0]?.playersPerSide).toBe(11);
  });

  it("D — existing user 3v3 preserved when topping up pitch count", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: {
        ...createDefaultTournamentComposerPlannerDraft(),
        pitchesUserCustomized: true,
        pitches: [
          {
            localId: "a",
            label: "Feld 1",
            playersPerSide: 3,
            userLabelCustomized: false,
          },
        ],
      },
      participantCount: 4,
      categoryContext: "E_FF12",
      preserveUserPitchEdits: true,
    });
    expect(planner.pitches[0]?.playersPerSide).toBe(3);
  });

  it("E — E_FF12 category does not auto-assign 3v3/6v6 on fresh materialisation", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(planner.pitches.map((p) => p.playersPerSide)).toEqual([null, null, null]);
  });

  it("F — participant count change may refresh proposal but not user-selected format", () => {
    let planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    planner = {
      ...planner,
      pitchesUserCustomized: true,
      pitches: planner.pitches.map((p) => ({ ...p, playersPerSide: 5 })),
    };
    const next = reconcileComposerPlannerForParticipants({
      planner,
      participantCount: 6,
      categoryContext: "E_FF12",
    });
    expect(next.pitches.every((p) => p.playersPerSide === 5)).toBe(true);
  });

  it("G — template selection sets structure only; buildScheduleRecommendationSummary is format-neutral", () => {
    const summary = buildScheduleRecommendationSummary({ fieldCount: 3, roundCount: 6 });
    expect(summary).toBe("3 Spielfelder · 6 Runden");
    expect(summary).not.toMatch(/\d+\s*gegen/i);
  });
});
