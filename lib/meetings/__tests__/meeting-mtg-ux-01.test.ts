import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-MTG-UX-01 meeting workspace redesign", () => {
  it("composes tabbed workspace without narrow tasks sidebar", () => {
    const workspace = readSrc("components/admin/meetings/workspace/MeetingWorkspace.tsx");
    expect(workspace).toContain("MeetingWorkspaceSectionNav");
    expect(workspace).not.toContain("xl:grid-cols-[minmax(0,1.85fr)_360px]");
    expect(workspace).toContain("MeetingWorkspaceStatusBar");
    expect(workspace).not.toContain("MeetingWorkspaceLifecyclePanel");
    expect(workspace).not.toContain("MeetingProtocolApprovalSection");
  });

  it("uses canonical SceDateTile in meeting header", () => {
    const header = readSrc("components/admin/meetings/workspace/MeetingWorkspaceHeader.tsx");
    expect(header).toContain("SceDateTile");
    expect(header).not.toContain("formatSwissDate");
  });

  it("opens contextual task creation in a dialog for meetings", () => {
    const panel = readSrc("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx");
    expect(panel).toContain("ContextualTaskCreateDialog");
    expect(panel).not.toContain("ContextualTaskInlineCreateForm");
    expect(readSrc("components/admin/meetings/workspace/MeetingTaskCreateScrollLink.tsx")).toContain(
      "meeting-open-task-create-dialog",
    );
  });

  it("uses progressive disclosure for participants and decisions", () => {
    const sections = readSrc("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx");
    expect(sections).toContain("meeting-participants-add-toggle");
    expect(sections).toContain("meeting-decision-create-toggle");
    expect(sections).toContain("MeetingTasksSection");
  });
});
