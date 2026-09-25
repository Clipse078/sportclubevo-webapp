import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clubDashboardSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardView.tsx"),
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

  it("keeps Schnellzugriff after cockpit without horizontal scroll strip", () => {
    const greetingIndex = clubDashboardSource.indexOf("<PersonalDashboardCockpitGreeting");
    const workspaceIndex = clubDashboardSource.indexOf("<PersonalDashboardWorkspace");
    const quickAccessIndex = clubDashboardSource.indexOf("<PersonalQuickAccess");
    expect(greetingIndex).toBeGreaterThan(-1);
    expect(workspaceIndex).toBeGreaterThan(greetingIndex);
    expect(quickAccessIndex).toBeGreaterThan(workspaceIndex);
    expect(quickAccessSource).toContain("flex-wrap");
    expect(quickAccessSource).not.toContain("overflow-x-auto");
  });

  it("uses cockpit grid and preserves primary workspace surfaces", () => {
    expect(clubDashboardSource).toContain("<PersonalDashboardWorkspace");
    expect(clubDashboardSource).not.toContain("DashboardMetricStrip");
    expect(clubDashboardSource).not.toContain("HeuteImVereinWidget");
    expect(clubDashboardSource).not.toContain("DashboardQuickActionStrip");
  });

  it("routes hero customization through compact dashboard customize dialog", () => {
    expect(greetingSource).toContain("PersonalDashboardCustomizeDialog");
    expect(greetingSource).toContain("initialBackgroundImageUrl");
  });
});
