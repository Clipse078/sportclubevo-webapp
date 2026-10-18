import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPlanungTimingConsequence } from "../planung-scheduling-settings-presentation";
import { buildTournamentPlanungViewModel } from "../build-planung-view-model";
import type { PlanungDomainSnapshot } from "../build-planung-view-model";

describe("01K-R7.1 — Spielplan operational editing", () => {
  const workspace = readFileSync(
    join(process.cwd(), "components/admin/tournamentcenter/planung/TournamentPlanungWorkspace.tsx"),
    "utf8",
  );
  const settings = readFileSync(
    join(
      process.cwd(),
      "components/admin/tournamentcenter/planung/TournamentPlanungSpielplanSettings.tsx",
    ),
    "utf8",
  );
  const roadmap = readFileSync(
    join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01K.md"),
    "utf8",
  );

  it("documents R7.1 edit-mode operational settings on roadmap", () => {
    expect(roadmap).toMatch(/01K-R7\.1|R7\.1/i);
    expect(roadmap).toMatch(/Spielplan-Einstellungen/i);
    expect(roadmap).toMatch(/Outside edit mode|Publizieren/i);
  });

  it("exposes Spielplan-Einstellungen only in edit mode and hides publication there", () => {
    expect(workspace).toMatch(/TournamentPlanungSpielplanSettings/);
    expect(workspace).toMatch(/model\.schedulingSettings/);
    expect(workspace).toMatch(/effectiveInteractionMode === "view"/);
    expect(workspace).toMatch(/TournamentPlanungPublicationPanel/);
    expect(workspace).not.toMatch(/Planungsdiagnose/);
  });

  it("uses canonical toggles for advanced pitch scope (no new checkboxes)", () => {
    expect(settings).toMatch(/SwitchToggle/);
    expect(settings).not.toMatch(/type="checkbox"/);
    expect(settings).toMatch(/planung-break-pitch-select/);
  });

  it("builds simple German timing consequence copy", () => {
    expect(buildPlanungTimingConsequence("NEEDS_REGENERATION")?.headline).toBe(
      "Der aktuelle Spielplan passt nicht mehr zu diesen Einstellungen.",
    );
    expect(buildPlanungTimingConsequence("MATCHES")?.headline).toBe(
      "Spielplan passt zu diesen Einstellungen.",
    );
  });

  it("includes scheduling settings on view model when schedule exists", () => {
    const vm = buildTournamentPlanungViewModel({
      tournamentId: "t1",
      ownership: "TENANT_ORGANISED",
      timezone: "Europe/Zurich",
      windowStartUtc: "2026-08-01T08:00:00.000Z",
      windowEndUtc: "2026-08-01T12:00:00.000Z",
      scheduleVersionId: "sv1",
      scheduleRevision: 1,
      schedulingConfig: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
      pitches: [{ id: "p1", displayOrder: 0, label: "Feld 1" }],
      breaks: [],
      fixtures: [],
      assignments: [{ id: "a1", fixtureId: "f1", tournamentPitchId: "p1", startAt: "2026-08-01T08:00:00.000Z", endAt: "2026-08-01T08:12:00.000Z", scheduleLockDimension: null }],
      participants: [],
      participantCount: 2,
      fixtureCount: 1,
      feasibility: null,
      smartTiming: null,
      optimisation: null,
      fixtureResults: [],
      groups: [],
      rankingConfiguration: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        tiebreakOrder: ["POINTS"],
      },
      scheduleConsistencyStatus: "MATCHES",
    } satisfies PlanungDomainSnapshot);
    expect(vm.schedulingSettings?.matchDurationMinutes).toBe(12);
    expect(vm.schedulingSettings?.transitionMinutes).toBe(3);
    expect(vm.diagnostics).toHaveLength(0);
  });
});
