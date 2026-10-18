import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01K-R7 — unified Spielplan + planning edit mode", () => {
  const workspace = readFileSync(
    join(process.cwd(), "components/admin/tournamentcenter/planung/TournamentPlanungWorkspace.tsx"),
    "utf8",
  );
  const roadmap = readFileSync(
    join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01K.md"),
    "utf8",
  );

  it("documents R7 canonical UX on the 01K roadmap", () => {
    expect(roadmap).toMatch(/01K-R7/i);
    expect(roadmap).toMatch(/VIEW \+ EDIT|VIEW\+EDIT/i);
    expect(roadmap).toMatch(/ONE PRIMARY SPIELPLAN|one primary Spielplan/i);
  });

  it("removes Planung/Spielplan inner toggle and redundant round list from workspace", () => {
    expect(workspace).not.toMatch(/tournament-planung-mode-planung/);
    expect(workspace).not.toMatch(/TournamentPlanungScheduleList/);
    expect(workspace).not.toMatch(/Übersicht nach Runden/);
    expect(workspace).toMatch(/Spielplan bearbeiten/);
    expect(workspace).toMatch(/Bearbeitung beenden/);
    expect(workspace).toMatch(/TournamentPlanungSpielplanOutput/);
    expect(workspace).toMatch(/TournamentPlanungBoard/);
    expect(workspace).toMatch(/data-interaction-mode/);
  });

  it("does not persist edit mode to the database", () => {
    expect(workspace).not.toMatch(/isEditing/);
    expect(workspace).not.toMatch(/planningMode/);
    expect(workspace).not.toMatch(/spielplanMode/);
  });
});
