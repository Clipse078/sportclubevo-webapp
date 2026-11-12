import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-CD-02R7 meetings workspace UX", () => {
  it("shows collapsed agenda metadata via presentation helper", () => {
    const sections = readSrc("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx");
    expect(sections).toContain("buildAgendaItemCollapsedMetadata");
    expect(sections).toContain("meeting-agenda-item-${item.id}-summary-meta");
    expect(sections).not.toContain("item.durationMin} min`");
  });

  it("wraps db-backed meeting detail with dirty shell and in-app navigation guard", () => {
    expect(readSrc("app/(admin)/vereinsleitung/meetings/[slug]/page.tsx")).toContain(
      "MeetingWorkspaceDirtyShell",
    );
    expect(readSrc("components/admin/meetings/workspace/MeetingWorkspaceDirtyShell.tsx")).toContain(
      "MeetingWorkspaceInAppNavigationGuard",
    );
    expect(readSrc("components/admin/meetings/workspace/MeetingWorkspaceDirtyShell.tsx")).toContain(
      "SceComposerDirtyCloseProvider",
    );
    expect(readSrc("components/admin/meetings/workspace/MeetingWorkspace.tsx")).toContain(
      "MeetingWorkspaceDirtyStateSync",
    );
  });
});
