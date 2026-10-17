import { describe, expect, it } from "vitest";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import {
  applyComposerRecommendedTiming,
  buildTournamentComposerSmartTimingView,
} from "../tournament-composer-smart-timing";

function fourTeamHomeDraft() {
  const base = createEmptyTournamentComposerDraft();
  base.homeAway = "HOME";
  base.startAt = "2026-06-01T10:00";
  base.endAt = "2026-06-01T12:00";
  base.participants = ["A", "B", "C", "D"].map((name, i) => ({
    localId: `p${i + 1}`,
    kind: "TEAM" as const,
    teamId: `t${i + 1}`,
    displayName: name,
    subLabel: null,
    dressingRooms: [],
  }));
  base.planner = createDefaultTournamentComposerPlannerDraft();
  base.planner.competitionFormat = "GROUP_MIX";
  base.planner.meetingsPerOpponent = 1;
  base.planner.pitches = [1, 2, 3, 4].map((n, i) => ({
    localId: `pitch-${n}`,
    label: `Feld ${n}`,
    displayOrder: i,
    facilityResourceId: null,
  }));
  return base;
}

describe("01H-R3 — composer smart timing operational rest", () => {
  it("recommends positive min rest for canonical 4-team / 4-pitch / 2h window", () => {
    const view = buildTournamentComposerSmartTimingView(fourTeamHomeDraft());
    expect(view.recommendedTiming).not.toBeNull();
    expect(view.recommendedTiming!.minRestMinutes).toBeGreaterThan(0);
  });

  it("apply recommendation sets min rest only on explicit user action", () => {
    const draft = fourTeamHomeDraft();
    draft.planner!.timing.minRestMinutes = 0;
    const view = buildTournamentComposerSmartTimingView(draft);
    expect(draft.planner!.timing.minRestMinutes).toBe(0);
    const updated = applyComposerRecommendedTiming(draft.planner!, view.recommendedTiming!);
    expect(updated.timing.minRestMinutes).toBe(view.recommendedTiming!.minRestMinutes);
  });
});
