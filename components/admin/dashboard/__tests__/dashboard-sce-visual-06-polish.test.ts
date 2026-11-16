import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("SCE-VISUAL-06 — dashboard polish", () => {
  it("uses ClubDevelopmentOverview-aligned section grid for primary modules", () => {
    const workspace = read("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).toContain("xl:grid-cols-2");
    expect(workspace).toContain("space-y-6");
    expect(workspace).toContain("SceWorkspaceSectionShell");
  });

  it("does not rely on legacy cockpit glass grid for primary modules", () => {
    const workspace = read("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).not.toContain("DashboardCockpitGrid");
    expect(workspace).not.toContain("DashboardCockpitCard");
  });

  it("uses workspace record rows and empty states in embedded previews", () => {
    const tasks = read("components/ui/dashboard/PersonalTasksPreview.tsx");
    const programme = read("components/ui/dashboard/PersonalProgrammeFeed.tsx");
    expect(tasks).toContain("SCE_WORKSPACE_RECORD_ROW_CLASS");
    expect(tasks).toContain("SceWorkspaceEmptyState");
    expect(programme).toContain("SceWorkspaceEmptyState");
  });

  it("keeps Schnellzugriff below cockpit and permission-aware", () => {
    const club = read("components/admin/dashboard/ClubDashboardCommandCenter.tsx");
    const workspaceIndex = club.indexOf("<PersonalDashboardWorkspace");
    const quickIndex = club.indexOf("<PersonalQuickAccess");
    expect(workspaceIndex).toBeGreaterThan(-1);
    expect(quickIndex).toBeGreaterThan(workspaceIndex);
    expect(club).toContain("resolvePersonalQuickAccess");
  });

  it("preserves greeting without injected exclamation", () => {
    const welcome = read("components/ui/dashboard/DashboardCompactWelcome.tsx");
    expect(welcome).not.toContain('after || "!"');
  });

  it("refines calendar day cells without full semantic tint wash", () => {
    const calendarGrid = read("components/ui/calendar/MonthActivityGrid.tsx");
    expect(calendarGrid).not.toContain("dayTintClass");
    expect(calendarGrid).toContain("PersonalProgrammeActivityIndicator");
  });
});