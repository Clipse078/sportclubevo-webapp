import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMeetingWorkspaceTabNavigationConfig } from "@/lib/nav/meeting-workspace-tab-config";
import { meetingWorkspaceSectionDomId } from "@/lib/nav/meeting-workspace-tab-config";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-MTG-PEND-01 — meeting workspace URL/section sync", () => {
  const counts = { traktanden: 1, beschluesse: 0, pendenzenOpen: 2, teilnehmer: 3 };

  it("exposes hash routes per section", () => {
    const config = buildMeetingWorkspaceTabNavigationConfig(counts);
    expect(config.tabRoutes?.pendenzen).toBe(`#${meetingWorkspaceSectionDomId("pendenzen")}`);
    expect(config.tabQueryParam).toBe("bereich");
  });

  it("uses anchor navigation provider in section nav", () => {
    const nav = readSrc("components/admin/meetings/workspace/MeetingWorkspaceSectionNav.tsx");
    expect(nav).toContain("MeetingWorkspaceSectionsProvider");
    expect(nav).toContain("aria-current");
    expect(nav).toContain('href={hrefForSection');
    expect(nav).not.toContain("SceContextTabProvider");

    const url = readSrc("lib/meetings/meeting-workspace-section-url.ts");
    expect(url).toContain("meeting-section-massnahmen");
  });

  it("stacks collapsible sections once in workspace", () => {
    const workspace = readSrc("components/admin/meetings/workspace/MeetingWorkspace.tsx");
    expect(workspace).toContain("MeetingWorkspaceCollapsibleSection");
    expect(workspace).not.toContain("activeTab ===");
    expect(workspace).not.toContain("MeetingActionsSection");
    expect(workspace).not.toContain("MeetingTasksSection");
    expect(workspace).toContain("relatedTasksCreateSlot");
    expect(workspace).toContain("lazy");
  });
});