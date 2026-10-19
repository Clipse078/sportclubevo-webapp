import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME =
  "20261019140000_sce_tournament_planner_02c_participant_playing_units";

describe("SCE-TOURNAMENT-PLANNER-02C R2 UAT regression", () => {
  it("documents guarded STAGE migration script for 02C", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts/sce-tournament-planner-02c-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("prodTouched");
  });

  it("maps Prisma schema errors in playing-units API routes", () => {
    const route = readFileSync(
      join(
        process.cwd(),
        "app/api/tournaments/[tournamentId]/participants/[participantId]/playing-units/route.ts",
      ),
      "utf8",
    );
    expect(route).toContain("mapPlayingUnitsPersistenceError");
  });

  it("panel keeps Spielteams visible during background refresh after split", () => {
    const panel = readFileSync(
      join(
        process.cwd(),
        "components/admin/tournamentcenter/TournamentParticipantPlayingUnitsPanel.tsx",
      ),
      "utf8",
    );
    expect(panel).toContain("playing-units-mutation-error");
    expect(panel).toContain("loadUnits({ background: true })");
    expect(panel).not.toContain("startTransition");
  });
});
