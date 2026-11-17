import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MEETING_WORKSPACE_SECONDARY_MENU_DESTRUCTIVE_ITEM_CLASS,
  MEETING_WORKSPACE_SECONDARY_MENU_ITEM_CLASS,
  MEETING_WORKSPACE_SECONDARY_MENU_POPOVER_CLASS,
} from "@/lib/meetings/meeting-workspace-secondary-menu-styles";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("meeting workspace secondary menu styling (scoped)", () => {
  it("keeps SCE navy neutral items and destructive danger tokens with focus-visible", () => {
    expect(MEETING_WORKSPACE_SECONDARY_MENU_ITEM_CLASS).toContain("text-[#0b1f3b]");
    expect(MEETING_WORKSPACE_SECONDARY_MENU_ITEM_CLASS).toContain("hover:bg-slate-50");
    expect(MEETING_WORKSPACE_SECONDARY_MENU_ITEM_CLASS).toContain("focus-visible:bg-slate-50");
    expect(MEETING_WORKSPACE_SECONDARY_MENU_ITEM_CLASS).toContain(
      "focus-visible:ring-[var(--sce-primary)]",
    );

    expect(MEETING_WORKSPACE_SECONDARY_MENU_DESTRUCTIVE_ITEM_CLASS).toContain(
      "text-[var(--sce-danger)]",
    );
    expect(MEETING_WORKSPACE_SECONDARY_MENU_DESTRUCTIVE_ITEM_CLASS).toContain(
      "hover:bg-[var(--sce-danger-light)]",
    );
    expect(MEETING_WORKSPACE_SECONDARY_MENU_DESTRUCTIVE_ITEM_CLASS).toContain(
      "focus-visible:bg-[var(--sce-danger-light)]",
    );

    expect(MEETING_WORKSPACE_SECONDARY_MENU_POPOVER_CLASS).toContain("!bg-white");
    expect(MEETING_WORKSPACE_SECONDARY_MENU_POPOVER_CLASS).toContain("!shadow-md");
  });

  it("wires scoped styles into status bar without overriding global popover chrome", () => {
    const statusBar = readSrc("components/admin/meetings/workspace/MeetingWorkspaceStatusBar.tsx");
    const deleteBtn = readSrc("components/admin/meetings/MeetingDeleteButton.tsx");

    expect(statusBar).toContain("meeting-workspace-secondary-menu-styles");
    expect(statusBar).toContain("MEETING_WORKSPACE_SECONDARY_MENU_POPOVER_CLASS");
    expect(statusBar).not.toMatch(
      /PopoverContent[\s\S]*?className="min-w-\[12rem\] rounded-lg/,
    );

    expect(deleteBtn).toContain("MEETING_WORKSPACE_SECONDARY_MENU_DESTRUCTIVE_ITEM_CLASS");
    expect(deleteBtn).not.toContain("text-red-700");
  });
});