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
  it("uses compact welcome and personal command center loader", () => {
    expect(clubDashboardSource).toContain("DashboardCompactWelcome");
    expect(clubDashboardSource).toContain("getPersonalCommandCenterData");
    expect(clubDashboardSource).not.toContain("DashboardHeroSection");
    expect(clubDashboardSource).not.toContain("DashboardMetricStrip");
  });

  it("orders Schnellzugriff before primary workspace", () => {
    const quickAccessIndex = clubDashboardSource.indexOf("<PersonalQuickAccess");
    const workspaceIndex = clubDashboardSource.indexOf("<PersonalDashboardWorkspace");
    expect(quickAccessIndex).toBeGreaterThan(-1);
    expect(workspaceIndex).toBeGreaterThan(quickAccessIndex);
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
    const attentionIndex = clubDashboardSource.indexOf("<PersonalAttention");
    const tasksIndex = clubDashboardSource.indexOf("<PersonalTasksPreview");
    const secondaryIndex = clubDashboardSource.indexOf("<PersonalDashboardSecondary");
    expect(secondaryIndex).toBeGreaterThan(tasksIndex);
    expect(secondaryIndex).toBeGreaterThan(attentionIndex);
  });

  it("coordinates calendar selection with programme feed", () => {
    expect(workspaceSource).toContain("onSelectedDayChange");
    expect(workspaceSource).toContain("showSelectedDayPanel={false}");
    expect(workspaceSource).toContain("highlightedDayKey={selectedDayKey}");
  });

  it("uses responsive programme-first grid on workspace", () => {
    expect(workspaceSource).toContain("lg:col-span-7");
    expect(workspaceSource).toContain("lg:col-span-5");
  });
});
