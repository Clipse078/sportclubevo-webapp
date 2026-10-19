import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01K-R7.3 — live Spielplan editor + schedule reconcile", () => {
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
  const board = readFileSync(
    join(process.cwd(), "components/admin/tournamentcenter/planung/TournamentPlanungBoard.tsx"),
    "utf8",
  );
  const fixtureCard = readFileSync(
    join(process.cwd(), "components/sce/tournament/SceTournamentFixtureCard.tsx"),
    "utf8",
  );
  const compact = readFileSync(
    join(process.cwd(), "components/sce/tournament/SceTournamentFixtureCompactMatchup.tsx"),
    "utf8",
  );
  const schedulingRoute = readFileSync(
    join(
      process.cwd(),
      "app/api/tournaments/[tournamentId]/planung/scheduling-config/route.ts",
    ),
    "utf8",
  );
  const reconcile = readFileSync(
    join(process.cwd(), "lib/tournaments/planung/planung-live-schedule-reconcile.server.ts"),
    "utf8",
  );
  const loadServer = readFileSync(
    join(process.cwd(), "lib/tournaments/planung/load-tournament-planung.server.ts"),
    "utf8",
  );

  it("A — team highlight card clusters crests around VS (no 1fr grid strip)", () => {
    expect(fixtureCard).toMatch(/sce-tournament-fixture-matchup-cluster/);
    expect(fixtureCard).not.toMatch(/grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  });

  it("B — edit board uses canonical stacked match identity block", () => {
    expect(board).toMatch(/layout="board"/);
    expect(compact).toMatch(/data-layout="board"/);
    expect(compact).toMatch(/SceMatchStackedFixtureIdentity/);
    expect(compact).toMatch(/data-crest-variant="canonicalStacked"/);
    expect(compact).not.toMatch(/layout === "board" \? "flex-nowrap"/);
  });

  it("C — ALL_PITCHES break band spans pitch columns", () => {
    expect(board).toMatch(/planung-board-all-pitches-break/);
    expect(board).toMatch(/gridColumn.*span/);
    expect(board).toMatch(/planung-board-pitch-break/);
  });

  it("D/E — live timing + home/away auto sync without manual apply", () => {
    expect(settings).not.toMatch(/planung-apply-settings/);
    expect(settings).not.toMatch(/Änderungen übernehmen/);
    expect(settings).toMatch(/TIMING_DEBOUNCE_MS/);
    expect(settings).toMatch(/usePlanungScheduleMutationQueue/);
    expect(settings).toMatch(/onBlur/);
    expect(settings).not.toMatch(/planung-home-away-relevance/);
    expect(schedulingRoute).toMatch(/applyPlanungLiveScheduleReconcile/);
    expect(schedulingRoute).not.toMatch(/scheduleConsistencyOverride/);
  });

  it("F — break mutations trigger live reconcile", () => {
    const breaksRoute = readFileSync(
      join(process.cwd(), "app/api/tournaments/[tournamentId]/planung/breaks/route.ts"),
      "utf8",
    );
    expect(breaksRoute).toMatch(/applyPlanungLiveScheduleReconcile/);
    expect(settings).toMatch(/scheduleVersionId: scheduleVersionIdRef.current/);
  });

  it("G — stale response protection via serial mutation queue", () => {
    expect(settings).toMatch(/enqueueScheduleMutation/);
    expect(settings).toMatch(/for \(let pass = 0; pass < 12; pass/);
  });

  it("H — timing auto-update uses partial regen, not fixture generator", () => {
    expect(reconcile).toMatch(/runTournamentScheduleRegeneration/);
    expect(reconcile).not.toMatch(/generateTournamentFixturesForEvent/);
    expect(loadServer).toMatch(/hasPersistedSchedule/);
    expect(loadServer).not.toMatch(/optimiseTournamentSchedule/);
  });

  it("I — obsolete normal-flow apply/regen controls removed from workspace header", () => {
    expect(workspace).not.toMatch(/tournament-planung-regenerate/);
    expect(workspace).toMatch(/planung-schedule-sync-status/);
    expect(workspace).toMatch(/Spielplan wird aktualisiert/);
  });

  it("J — MATCHES does not surface noisy success copy in edit settings", () => {
    const presentation = readFileSync(
      join(
        process.cwd(),
        "lib/tournaments/planung/planung-scheduling-settings-presentation.ts",
      ),
      "utf8",
    );
    expect(presentation).toMatch(/status === "MATCHES"\) return null|!status \|\| status === "MATCHES"\) return null/);
    expect(presentation).not.toMatch(/Spielplan aktuell ✓/);
  });
});
