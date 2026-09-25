import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clubDashboardSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardView.tsx"),
  "utf8",
);

const workspaceSource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/PersonalDashboardWorkspace.tsx"),
  "utf8",
);

describe("DASHBOARD-06 — personal command center composition", () => {
  it("uses personal cockpit greeting and personal command center loader", () => {
    expect(clubDashboardSource).toContain("PersonalDashboardCockpitGreeting");
    expect(clubDashboardSource).toContain("getPersonalCommandCenterData");
    expect(clubDashboardSource).not.toContain("DashboardHeroSection");
    expect(clubDashboardSource).not.toContain("DashboardMetricStrip");
  });

  it("orders Schnellzugriff after primary cockpit workspace", () => {
    const quickAccessIndex = clubDashboardSource.indexOf("<PersonalQuickAccess");
    const workspaceIndex = clubDashboardSource.indexOf("<PersonalDashboardWorkspace");
    expect(quickAccessIndex).toBeGreaterThan(-1);
    expect(workspaceIndex).toBeGreaterThan(-1);
    expect(quickAccessIndex).toBeGreaterThan(workspaceIndex);
  });

  it("includes programme, calendar, attention, and tasks surfaces", () => {
    expect(clubDashboardSource).toContain("<PersonalDashboardWorkspace");
    expect(clubDashboardSource).toContain("<PersonalAttention");
    expect(clubDashboardSource).toContain("<PersonalTasksPreview");
  });

  it("removes legacy primary dashboard widgets", () => {
    expect(clubDashboardSource).not.toContain("HeuteImVereinWidget");
    expect(clubDashboardSource).not.toContain("MeineAgendaWidget");
    expect(clubDashboardSource).not.toContain("DashboardOperationalGrid");
    expect(clubDashboardSource).not.toContain("Schnellaktionen");
    expect(clubDashboardSource).not.toContain("DashboardQuickActionStrip");
  });

  it("demotes secondary content into collapsible section", () => {
    expect(clubDashboardSource).toContain("<PersonalDashboardSecondary");
    const workspaceIndex = clubDashboardSource.indexOf("<PersonalDashboardWorkspace");
    const secondaryIndex = clubDashboardSource.indexOf("<PersonalDashboardSecondary");
    expect(secondaryIndex).toBeGreaterThan(workspaceIndex);
  });

  it("coordinates calendar selection with programme feed", () => {
    expect(workspaceSource).toContain("onSelectedDayChange");
    expect(workspaceSource).toContain("showSelectedDayPanel");
    expect(workspaceSource).toContain("DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT");
    expect(workspaceSource).toContain("highlightedDayKey={selectedDayKey}");
  });

  it("uses balanced 2×2 cockpit grid on workspace", () => {
    expect(workspaceSource).toContain("DashboardCockpitGrid");
    expect(workspaceSource).toContain("DashboardCockpitCard");
  });
});
