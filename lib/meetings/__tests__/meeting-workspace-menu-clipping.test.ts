import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

/**
 * Documents the clipping boundary: Sitzungsübersicht uses SCE_CD_SECTION_SHELL_CLASS
 * (`overflow-hidden`). The secondary menu must port to PopoverContent, not absolute inside the shell.
 */
describe("Meeting workspace summary menu clipping boundary", () => {
  it("keeps overflow-hidden on section shell and portals the actions menu", () => {
    const shellStyles = readSrc("components/admin/club-development/sce-club-development-surface-styles.ts");
    const statusBar = readSrc("components/admin/meetings/workspace/MeetingWorkspaceStatusBar.tsx");
    const workspace = readSrc("components/admin/meetings/workspace/MeetingWorkspace.tsx");

    expect(shellStyles).toContain("overflow-hidden");
    expect(workspace).toContain("SceClubDevelopmentSectionShell");
    expect(statusBar).toContain("PopoverContent");
    expect(statusBar).toContain("meeting-workspace-summary-menu-popover");
    expect(statusBar).not.toMatch(/className="absolute right-0 top-full/);
  });
});