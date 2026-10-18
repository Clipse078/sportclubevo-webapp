import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01K-R7.2 — instant Spielplan settings + performance guardrails", () => {
  const settings = readFileSync(
    join(
      process.cwd(),
      "components/admin/tournamentcenter/planung/TournamentPlanungSpielplanSettings.tsx",
    ),
    "utf8",
  );
  const workspace = readFileSync(
    join(process.cwd(), "components/admin/tournamentcenter/planung/TournamentPlanungWorkspace.tsx"),
    "utf8",
  );
  const loadServer = readFileSync(
    join(process.cwd(), "lib/tournaments/planung/load-tournament-planung.server.ts"),
    "utf8",
  );
  const board = readFileSync(
    join(process.cwd(), "components/admin/tournamentcenter/planung/TournamentPlanungBoard.tsx"),
    "utf8",
  );

  it("uses local timing draft with explicit apply — no blur persistence", () => {
    expect(settings).toMatch(/planung-apply-settings/);
    expect(settings).toMatch(/Änderungen übernehmen/);
    expect(settings).not.toMatch(/onBlur/);
    expect(settings).not.toMatch(/onBusyChange/);
    expect(settings).toMatch(/fixtureHomeAwayRelevance/);
    expect(settings).toMatch(/SwitchToggle/);
    expect(settings).toMatch(/planung-home-away-relevance/);
  });

  it("does not expose publication panel in Spielplan workspace", () => {
    expect(workspace).not.toMatch(/TournamentPlanungPublicationPanel/);
  });

  it("edit board uses canonical board inline fixture identity", () => {
    expect(board).toMatch(/layout="board"/);
  });

  it("skips feasibility/smart-timing/optimiser when persisted assignments exist", () => {
    expect(loadServer).toMatch(/hasPersistedSchedule/);
    expect(loadServer).not.toMatch(/optimiseTournamentSchedule/);
    expect(loadServer).toMatch(/assessPlanungScheduleConsistency/);
  });

  it("scheduling-config apply accepts home/away relevance", () => {
    const route = readFileSync(
      join(
        process.cwd(),
        "app/api/tournaments/[tournamentId]/planung/scheduling-config/route.ts",
      ),
      "utf8",
    );
    expect(route).toMatch(/fixtureHomeAwayRelevance/);
    expect(route).toMatch(/scheduleConsistencyOverride/);
  });
});
