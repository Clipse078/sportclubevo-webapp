import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveContextTabFromSearchParams } from "@/lib/context-tabs/url";
import { buildMeetingWorkspaceTabNavigationConfig } from "@/lib/nav/meeting-workspace-tab-config";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-MTG-PEND-01 — meeting workspace URL/tab sync", () => {
  const counts = { traktanden: 1, beschluesse: 0, pendenzenOpen: 2, teilnehmer: 3 };

  it("uses bereich query param for deep links", () => {
    const config = buildMeetingWorkspaceTabNavigationConfig(counts);
    expect(config.tabQueryParam).toBe("bereich");
    expect(
      resolveContextTabFromSearchParams({
        tabParam: "pendenzen",
        defaultTab: config.defaultTab,
        visibleTabs: config.tabs,
      }),
    ).toBe("pendenzen");
  });

  it("falls back to traktanden for unknown bereich values", () => {
    const config = buildMeetingWorkspaceTabNavigationConfig(counts);
    expect(
      resolveContextTabFromSearchParams({
        tabParam: "not-a-tab",
        defaultTab: config.defaultTab,
        visibleTabs: config.tabs,
      }),
    ).toBe("traktanden");
  });

  it("wires SceContextTabProvider in section nav", () => {
    const nav = readSrc("components/admin/meetings/workspace/MeetingWorkspaceSectionNav.tsx");
    expect(nav).toContain("SceContextTabProvider");
    expect(nav).toContain("useContextDetailTab");
    expect(nav).toContain("meeting-section-massnahmen");
  });

  it("does not render duplicate Massnahmen/Aufgaben panels in workspace", () => {
    const workspace = readSrc("components/admin/meetings/workspace/MeetingWorkspace.tsx");
    expect(workspace).not.toContain("MeetingActionsSection");
    expect(workspace).not.toContain("MeetingTasksSection");
    expect(workspace).toContain("relatedTasksCreateSlot");
  });
});
