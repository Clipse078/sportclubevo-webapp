import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clubDashboardSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardView.tsx"),
  "utf8",
);

const commandCenterSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardCommandCenter.tsx"),
  "utf8",
);

const quickAccessSource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/PersonalQuickAccess.tsx"),
  "utf8",
);

const greetingSource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/PersonalDashboardCockpitGreeting.tsx"),
  "utf8",
);

describe("DASHBOARD-07R1 — visual remediation composition", () => {
  it("uses compact personal greeting with integrated context (SCE-VISUAL-05)", () => {
    expect(clubDashboardSource).toContain("PersonalDashboardCockpitGreeting");
    expect(clubDashboardSource).toContain("getUserDashboardHeroState");
    expect(clubDashboardSource).not.toContain("PersonalIdentityHeader");
    expect(greetingSource).toContain('data-testid="personal-dashboard-greeting"');
    expect(greetingSource).toContain("DashboardCompactWelcome");
  });

  it("keeps Meine Bereiche after primary sections without horizontal scroll strip", () => {
    expect(clubDashboardSource).toContain("ClubDashboardCommandCenter");
    expect(commandCenterSource).toContain("ClubDashboardProgrammeSectionAsync");
    expect(commandCenterSource).toContain("ClubDashboardQuickAccessSectionAsync");

    const workspaceIndex = commandCenterSource.indexOf("ClubDashboardProgrammeSectionAsync");
    const quickAccessIndex = commandCenterSource.indexOf("ClubDashboardQuickAccessSectionAsync");
    expect(workspaceIndex).toBeGreaterThan(-1);
    expect(quickAccessIndex).toBeGreaterThan(workspaceIndex);

    expect(quickAccessSource).toContain("SceWorkspaceSectionShell");
    expect(quickAccessSource).toContain("sm:grid-cols-2");
    expect(quickAccessSource).not.toContain("overflow-x-auto");
  });

  it("preserves primary workspace surfaces without legacy metric strip", () => {
    expect(commandCenterSource).toContain("personal-dashboard-workspace");
    expect(clubDashboardSource).not.toContain("DashboardMetricStrip");
    expect(clubDashboardSource).not.toContain("HeuteImVereinWidget");
    expect(clubDashboardSource).not.toContain("DashboardQuickActionStrip");
  });

  it("keeps customize dialog module without mounting on dashboard greeting (R4)", () => {
    expect(greetingSource).not.toContain("PersonalDashboardCustomizeDialog");
    expect(greetingSource).toContain("initialBackgroundImageUrl");
  });
});
