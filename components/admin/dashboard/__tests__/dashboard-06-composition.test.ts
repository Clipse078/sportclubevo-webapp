import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clubDashboardSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardView.tsx"),
  "utf8",
);

const clubDashboardDeferredSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardCommandCenterAsync.tsx"),
  "utf8",
);

const workspaceSource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/PersonalDashboardWorkspace.tsx"),
  "utf8",
);

describe("DASHBOARD-06 — personal command center composition", () => {
  it("uses personal cockpit greeting and personal command center loader", () => {
    expect(clubDashboardSource).toContain("PersonalDashboardCockpitGreeting");
    expect(clubDashboardDeferredSource).toContain("getPersonalCommandCenterData");
    expect(clubDashboardSource).toContain("Suspense");
    expect(clubDashboardSource).not.toContain("DashboardHeroSection");
    expect(clubDashboardSource).not.toContain("DashboardMetricStrip");
  });

  it("orders Schnellzugriff after primary cockpit workspace", () => {
    const quickAccessIndex = clubDashboardDeferredSource.indexOf("<PersonalQuickAccess");
    const workspaceIndex = clubDashboardDeferredSource.indexOf("<PersonalDashboardWorkspace");
    expect(quickAccessIndex).toBeGreaterThan(-1);
    expect(workspaceIndex).toBeGreaterThan(-1);
    expect(quickAccessIndex).toBeGreaterThan(workspaceIndex);
  });

  it("includes programme, calendar, attention, and tasks surfaces", () => {
    expect(clubDashboardDeferredSource).toContain("<PersonalDashboardWorkspace");
    expect(clubDashboardDeferredSource).toContain("<PersonalAttention");
    expect(clubDashboardDeferredSource).toContain("<PersonalTasksPreview");
  });

  it("removes legacy primary dashboard widgets", () => {
    expect(clubDashboardSource).not.toContain("HeuteImVereinWidget");
    expect(clubDashboardSource).not.toContain("MeineAgendaWidget");
    expect(clubDashboardSource).not.toContain("DashboardOperationalGrid");
    expect(clubDashboardSource).not.toContain("Schnellaktionen");
    expect(clubDashboardSource).not.toContain("DashboardQuickActionStrip");
  });

  it("demotes secondary content into collapsible section", () => {
    expect(clubDashboardDeferredSource).toContain("<PersonalDashboardSecondary");
    const workspaceIndex = clubDashboardDeferredSource.indexOf("<PersonalDashboardWorkspace");
    const secondaryIndex = clubDashboardDeferredSource.indexOf("<PersonalDashboardSecondary");
    expect(secondaryIndex).toBeGreaterThan(workspaceIndex);
  });

  it("links programme section to personal Kalender without embedded month grid", () => {
    expect(workspaceSource).toContain("buildMeinProgrammKalenderOpenHref");
    expect(workspaceSource).toContain("DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT");
    expect(workspaceSource).not.toContain("PersonalProgrammeMonthCalendar");
  });

  it("uses SCE workspace section shells for primary dashboard modules", () => {
    expect(workspaceSource).toContain("SceWorkspaceSectionShell");
    expect(workspaceSource).toContain('data-sce-dashboard-layout="cd-reference"');
    expect(workspaceSource).not.toContain("DashboardCockpitGrid");
  });
});
