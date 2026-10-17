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

describe("01H-R4 — creator timing without user-facing minimum rest", () => {
  it("B — smart timing recommends match duration and transition only", () => {
    const view = buildTournamentComposerSmartTimingView(fourTeamHomeDraft());
    expect(view.recommendedTiming).not.toBeNull();
    expect(view.recommendedTiming!.matchDurationMinutes).toBeGreaterThan(0);
    expect(view.recommendedTiming!.transitionMinutes).toBeGreaterThanOrEqual(0);
    expect(view.recommendedTiming).not.toHaveProperty("minRestMinutes");
  });

  it("C — apply recommendation updates match/transition but preserves internal min rest", () => {
    const draft = fourTeamHomeDraft();
    draft.planner!.timing.minRestMinutes = 0;
    const view = buildTournamentComposerSmartTimingView(draft);
    const updated = applyComposerRecommendedTiming(draft.planner!, view.recommendedTiming!);
    expect(updated.timing.matchDurationMinutes).toBe(view.recommendedTiming!.matchDurationMinutes);
    expect(updated.timing.transitionMinutes).toBe(view.recommendedTiming!.transitionMinutes);
    expect(updated.timing.minRestMinutes).toBe(0);
  });
});
