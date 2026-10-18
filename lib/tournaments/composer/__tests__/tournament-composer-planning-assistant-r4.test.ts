import { describe, expect, it } from "vitest";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import {
  buildComposerPlanningAssistantUx,
  buildTournamentComposerSmartTimingView,
} from "../tournament-composer-smart-timing";

function homeDraft() {
  const base = createEmptyTournamentComposerDraft();
  base.homeAway = "HOME";
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
  base.planner = createDefaultTournamentComposerPlannerDraft();
  return base;
}

describe("01K-R4 — creator planning assistant", () => {
  it("shows READY when assessment is feasible", () => {
    const view = buildTournamentComposerSmartTimingView(homeDraft());
    const ux = buildComposerPlanningAssistantUx(view, view.recommendedTiming ?? undefined);
    expect(ux?.state).toBe("READY");
    expect(ux?.headline).toBe("Alles bereit.");
  });

  it("does not expose smart-timing-feasibility dashboard copy in panel source", () => {
    const source = require("node:fs").readFileSync(
      require("node:path").join(
        process.cwd(),
        "components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx",
      ),
      "utf8",
    );
    expect(source).not.toMatch(/smart-timing-feasibility/);
    expect(source).not.toMatch(/SCE Smart Timing/);
    expect(source).toMatch(/Empfehlung übernehmen/);
  });
});
