import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("SCE-VISUAL-07 — /dashboard ClubDevelopmentOverview reference", () => {
  it("uses shared workspace section shell on personal dashboard surfaces", () => {
    const workspace = read("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    const quickAccess = read("components/ui/dashboard/PersonalQuickAccess.tsx");

    expect(workspace).toContain("SceWorkspaceSectionShell");
    expect(workspace).toContain('data-sce-dashboard-layout="cd-reference"');
    expect(workspace).not.toContain("DashboardCockpitCard");
    expect(workspace).not.toContain("DashboardCockpitGrid");
    expect(quickAccess).toContain("SceWorkspaceSectionShell");
    expect(quickAccess).toContain("areasTitle");
  });

  it("orders sections: attention, programme + tasks, then Meine Bereiche", () => {
    const workspace = read("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    const commandCenter = read("components/admin/dashboard/ClubDashboardCommandCenter.tsx");

    const attentionIndex = workspace.indexOf("personal-dashboard-attention-section");
    const programmeIndex = workspace.indexOf("personal-dashboard-programme-section");
    const tasksIndex = workspace.indexOf("personal-dashboard-tasks-section");
    expect(attentionIndex).toBeGreaterThan(-1);
    expect(programmeIndex).toBeGreaterThan(attentionIndex);
    expect(tasksIndex).toBeGreaterThan(programmeIndex);

    const cmdAttentionIndex = commandCenter.indexOf("ClubDashboardAttentionSectionAsync");
    const quickIndex = commandCenter.indexOf("ClubDashboardQuickAccessSectionAsync");
    expect(cmdAttentionIndex).toBeGreaterThan(-1);
    expect(quickIndex).toBeGreaterThan(cmdAttentionIndex);
  });

  it("matches Vereinsentwicklung Übersicht page width on /dashboard", () => {
    const page = read("app/(admin)/dashboard/(personal-dashboard)/page.tsx");
    const view = read("components/admin/dashboard/ClubDashboardView.tsx");
    expect(page).toContain("<PageShell fullWidth>");
    expect(page).not.toContain('widthMode="dashboard"');
    expect(view).toContain('data-sce-page-width="full"');
  });

  it("surfaces welcome intro copy without hero photograph", () => {
    const view = read("components/admin/dashboard/ClubDashboardView.tsx");
    const greeting = read("components/ui/dashboard/PersonalDashboardCockpitGreeting.tsx");
    expect(view).toContain('getTranslations("PersonalDashboard.welcome")');
    expect(view).toContain("introLine={introLine}");
    expect(greeting).toContain("introLine");
    expect(view).not.toContain("PersonalIdentityHeader");
  });

  it("keeps permission-aware data loading and task gating", () => {
    const commandCenter = read("components/admin/dashboard/ClubDashboardCommandCenter.tsx");
    expect(commandCenter).toContain("ClubDashboardTasksSectionAsync");
    const attentionSection = read(
      "components/admin/dashboard/sections/ClubDashboardAttentionSectionAsync.tsx",
    );
    expect(attentionSection).toContain("embeddedInSectionShell");
    expect(attentionSection).toContain("viewAllHref");
  });

  it("uses SCE record rows for embedded task preview", () => {
    const tasks = read("components/ui/dashboard/PersonalTasksPreview.tsx");
    expect(tasks).toContain("SCE_WORKSPACE_RECORD_ROW_CLASS");
    expect(tasks).toContain("SceWorkspaceEmptyState");
  });

  it("exposes generalized workspace surface tokens without forking Vereinsentwicklung styles", () => {
    const styles = read("lib/sce/sce-workspace-surface-styles.ts");
    expect(styles).toContain("sce-club-development-surface-styles");
    expect(styles).toContain("SCE_WORKSPACE_RECORD_ROW_CLASS");
  });
});