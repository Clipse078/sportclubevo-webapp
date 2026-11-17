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

  it("portals Beschluss/Pendenz overflow menus outside expandable panels", () => {
    const menu = readSrc("components/admin/meetings/workspace/MeetingOutcomeMoreActionsMenu.tsx");
    const expandable = readSrc("components/sce/page/SceExpandablePanel.tsx");

    expect(expandable).toContain("data-sce-expandable-panel");
    expect(menu).toContain("PopoverContent");
    expect(menu).toContain("event.stopPropagation()");
    expect(menu).not.toMatch(/className="absolute right-0/);
    expect(menu).toContain("SceInlineDestructiveConfirm");
    expect(menu).toContain("MEETING_WORKSPACE_MENU_POPOVER_SURFACE_CLASS");
    expect(menu).toContain("meeting-workspace-secondary-menu-styles");
  });
});