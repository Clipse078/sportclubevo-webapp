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

const identitySource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/PersonalIdentityHeader.tsx"),
  "utf8",
);

describe("DASHBOARD-07R1 — visual remediation composition", () => {
  it("uses compact personal identity header with integrated context", () => {
    expect(clubDashboardSource).toContain("PersonalIdentityHeader");
    expect(clubDashboardSource).toContain("getUserDashboardHeroState");
    expect(clubDashboardSource).toContain("tenantCrestUrl");
    expect(clubDashboardSource).not.toContain("DashboardCompactWelcome");
    expect(identitySource).toContain('data-testid="personal-identity-header"');
    expect(identitySource).toContain("DashboardCompactWelcome");
  });

  it("keeps Schnellzugriff immediately after identity without horizontal scroll strip", () => {
    const identityIndex = clubDashboardSource.indexOf("<PersonalIdentityHeader");
    const quickAccessIndex = clubDashboardSource.indexOf("<PersonalQuickAccess");
    const workspaceIndex = clubDashboardSource.indexOf("<PersonalDashboardWorkspace");
    expect(identityIndex).toBeGreaterThan(-1);
    expect(quickAccessIndex).toBeGreaterThan(identityIndex);
    expect(workspaceIndex).toBeGreaterThan(quickAccessIndex);
    expect(quickAccessSource).toContain("flex-wrap");
    expect(quickAccessSource).not.toContain("overflow-x-auto");
  });

  it("uses compact action layer and preserves primary workspace surfaces", () => {
    expect(clubDashboardSource).toContain('data-testid="personal-action-layer"');
    expect(clubDashboardSource).toContain("<PersonalDashboardWorkspace");
    expect(clubDashboardSource).not.toContain("DashboardMetricStrip");
    expect(clubDashboardSource).not.toContain("HeuteImVereinWidget");
    expect(clubDashboardSource).not.toContain("DashboardQuickActionStrip");
  });

  it("provides no-image fallback treatment in identity header", () => {
    expect(identitySource).toContain("tenantCrestUrl");
    expect(identitySource).toMatch(/hasPhoto|backgroundImageUrl/);
  });
});
