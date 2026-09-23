import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  clampWorkspaceInspectorWidth,
  clampWorkspaceNavWidth,
  WORKSPACE_INSPECTOR_WIDTH_MIN,
  WORKSPACE_NAV_WIDTH_MAX,
} from "@/lib/workspace/ui/workspace-pane-preferences";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("WORKSPACE-09-06 product polish", () => {
  it("W09-06-01 workspace page uses resizable three-pane layout shell", () => {
    const page = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(page).toMatch(/resizableLayout/);
    expect(page).toMatch(/WorkspaceFolderNavPanel/);
    const navPanel = read("components/admin/workspace/WorkspaceFolderNavPanel.tsx");
    expect(navPanel).toMatch(/WorkspaceSidebarNavigation/);
    expect(page).toMatch(/WorkspaceCollaborationProvider/);
  });

  it("W09-06-02 pane preferences persist in localStorage only", () => {
    const prefs = read("lib/workspace/ui/workspace-pane-preferences.ts");
    expect(prefs).toMatch(/localStorage/);
    expect(prefs).not.toMatch(/prisma/);
  });

  it("W09-06-03 favorites toggle is exposed in document row/actions", () => {
    const row = read("components/admin/workspace/WorkspaceDocumentRow.tsx");
    const actions = read("components/admin/workspace/WorkspaceDocumentActions.tsx");
    expect(row).toMatch(/WorkspaceDocumentActions/);
    expect(actions).toMatch(/toggleFavorite/);
  });

  it("W09-06-04 recent access uses canonical POST API", () => {
    const route = read("app/api/workspace/recent/route.ts");
    expect(route).toMatch(/recordWorkspaceRecentAccess/);
    const shell = read("components/admin/workspace/WorkspaceClientShell.tsx");
    expect(shell).toMatch(/useWorkspaceRecentRecorder/);
  });

  it("W09-06-05 + Neu menu includes upload alongside folder create", () => {
    const bar = read("components/admin/workspace/WorkspaceCommandBar.tsx");
    expect(bar).toMatch(/uploadMenuItem/);
    expect(bar).toMatch(/CreateFolderMenuItem/);
  });

  it("W09-06-06 collaboration lists include display names", () => {
    const favorites = read("lib/workspace/collaboration/favorites-service.ts");
    const recent = read("lib/workspace/collaboration/recent-service.ts");
    expect(favorites).toMatch(/name: display.name/);
    expect(recent).toMatch(/name: display.name/);
  });

  it("W09-06-07 pane width clamps respect min/max", () => {
    expect(clampWorkspaceNavWidth(50)).toBeGreaterThanOrEqual(200);
    expect(clampWorkspaceNavWidth(999)).toBe(WORKSPACE_NAV_WIDTH_MAX);
    expect(clampWorkspaceInspectorWidth(100)).toBe(WORKSPACE_INSPECTOR_WIDTH_MIN);
  });
});
