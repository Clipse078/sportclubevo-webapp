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

  it("opens contextual task creation inline for meetings", () => {
    const panel = readSrc("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx");
    expect(panel).toContain("MeetingContextualTaskInlineCreateCard");
    expect(panel).not.toMatch(/import ContextualTaskCreateDialog/);
    expect(readSrc("components/admin/meetings/workspace/MeetingTaskCreateScrollLink.tsx")).toContain(
      "meeting-open-inline-task-create",
    );
  });

  it("dismisses secondary actions menu on outside press and Escape", () => {
    const statusBar = readSrc("components/admin/meetings/workspace/MeetingWorkspaceStatusBar.tsx");
    expect(statusBar).toContain('addEventListener("mousedown"');
    expect(statusBar).toContain('event.key === "Escape"');
    expect(statusBar).not.toContain("meeting-mark-conducted");
    expect(statusBar).toContain('presentation="menu"');
  });

  it("keeps destructive delete out of page header actions", () => {
    const page = readSrc("app/(admin)/vereinsleitung/meetings/[slug]/page.tsx");
    expect(page).not.toContain("MeetingDeleteButton");
  });

  it("uses progressive disclosure for participants and decisions", () => {
    const sections = readSrc("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx");
    expect(sections).toContain("meeting-participants-add-toggle");
    expect(sections).toContain("meeting-decision-create-toggle");
    expect(sections).toContain("MeetingTasksSection");
  });
});
