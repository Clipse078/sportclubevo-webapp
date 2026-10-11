import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as ContextTabs from "@/lib/context-tabs";

const ACTIVITY_SHELLS = [
  "components/admin/training/TrainingSessionActivityTabShell.tsx",
  "components/admin/matchcenter/record/SpieleMatchRecordWorkspace.tsx",
  "components/admin/tournamentcenter/TurniereTournamentActivityTabShell.tsx",
  "components/admin/veranstaltungen/ClubEventActivityTabShell.tsx",
];

describe("SCE-UI-ROLLOUT-01B — architecture guardrails", () => {
  it("exports canonical context tab primitives from lib/context-tabs", () => {
    expect(ContextTabs.SceContextTabProvider).toBeDefined();
    expect(ContextTabs.SceContextDirtyGuardProvider).toBeDefined();
    expect(ContextTabs.buildContextTabHref).toBeDefined();
    expect(ContextTabs.resolveContextTabFromSearchParams).toBeDefined();
    expect(ContextTabs.SceContextTabPanel).toBeDefined();
  });

  it("activity detail shells consume canonical SceContextTabsBoundary", () => {
    for (const relativePath of ACTIVITY_SHELLS) {
      const source = readFileSync(relativePath, "utf8");
      expect(source).toContain("SceContextTabsBoundary");
      expect(source).toContain("SceContextDirtyGuardProvider");
    }
  });

  it("ActivityDetailNavigation delegates to SceContextTabs", () => {
    const source = readFileSync(
      "components/admin/activity-navigation/ActivityDetailNavigation.tsx",
      "utf8",
    );
    expect(source).toContain("SceContextTabs");
    expect(source).not.toMatch(/role=\"tablist\"/);
  });
});
