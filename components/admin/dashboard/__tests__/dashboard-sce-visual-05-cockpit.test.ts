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

const greetingSource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/PersonalDashboardCockpitGreeting.tsx"),
  "utf8",
);

const compactWelcomeSource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/DashboardCompactWelcome.tsx"),
  "utf8",
);

const customizeSource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/PersonalDashboardCustomizeDialog.tsx"),
  "utf8",
);

const gridSource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/DashboardCockpitGrid.tsx"),
  "utf8",
);

const cardSource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/DashboardCockpitCard.tsx"),
  "utf8",
);

const surfaceSource = readFileSync(
  join(process.cwd(), "lib/dashboard/dashboard-cockpit-surface.ts"),
  "utf8",
);

const identitySource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/PersonalIdentityHeader.tsx"),
  "utf8",
);

describe("SCE-VISUAL-05 — personal dashboard cockpit", () => {
  it("removes personalized hero photograph from dashboard page composition", () => {
    expect(clubDashboardSource).not.toContain("PersonalIdentityHeader");
    expect(clubDashboardSource).not.toContain("backgroundImageUrl={identityBackgroundUrl}");
    expect(clubDashboardSource).toContain("PersonalDashboardCockpitGreeting");
  });

  it("keeps compact personalized greeting with tenant/date context", () => {
    expect(greetingSource).toContain("DashboardCompactWelcome");
    expect(greetingSource).toContain('data-testid="personal-dashboard-greeting"');
    expect(clubDashboardSource).toContain("formatTodayDate");
    expect(clubDashboardSource).toContain("ctx?.name");
  });

  it("does not inject a trailing exclamation mark into the compact greeting", () => {
    expect(compactWelcomeSource).not.toContain('after || "!"');
  });

  it("renders four canonical cockpit modules via workspace slots", () => {
    expect(clubDashboardSource).toContain("<PersonalDashboardWorkspace");
    expect(clubDashboardSource).toContain("attentionSlot=");
    expect(clubDashboardSource).toContain("tasksSlot=");
    expect(workspaceSource).toContain("PersonalProgrammeFeed");
    expect(workspaceSource).toContain("PersonalProgrammeMonthCalendar");
    expect(workspaceSource).toContain("attentionSlot");
    expect(workspaceSource).toContain("tasksSlot");
  });

  it("exposes desktop 2×2 grid contract", () => {
    expect(gridSource).toContain('data-testid="dashboard-cockpit-grid"');
    expect(gridSource).toContain("md:grid-cols-2");
    expect(gridSource).toContain("repeat(2,minmax(0,1fr))");
  });

  it("uses shared cockpit glass card surface for all modules", () => {
    expect(cardSource).toContain("dashboardCockpitSurfaceClassName");
    expect(surfaceSource).toContain("backdrop-blur");
    expect(workspaceSource).toContain("DashboardCockpitCard");
  });

  it("preserves personalized programme and calendar data wiring", () => {
    expect(clubDashboardSource).toContain("getPersonalCommandCenterData");
    expect(clubDashboardSource).toContain("programmeFeedGroups");
    expect(clubDashboardSource).toContain("programmeItems");
    expect(workspaceSource).toContain("DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT");
    expect(workspaceSource).toContain("onSelectedDayChange");
  });

  it("preserves attention and tasks data sources", () => {
    expect(clubDashboardSource).toContain("<PersonalAttention");
    expect(clubDashboardSource).toContain("personal.personalAttention.items");
    expect(clubDashboardSource).toContain("personalTaskPreview");
  });

  it("keeps permission-aware quick access below cockpit", () => {
    const workspaceIndex = clubDashboardSource.indexOf("<PersonalDashboardWorkspace");
    const quickAccessIndex = clubDashboardSource.indexOf("<PersonalQuickAccess");
    expect(workspaceIndex).toBeGreaterThan(-1);
    expect(quickAccessIndex).toBeGreaterThan(workspaceIndex);
    expect(clubDashboardSource).toContain("resolvePersonalQuickAccess");
  });

  it("keeps dashboard customization entry as compact action", () => {
    expect(greetingSource).toContain("PersonalDashboardCustomizeDialog");
    expect(customizeSource).toContain('data-testid="personal-dashboard-customize-trigger"');
  });

  it("avoids hard-coded FCA/Michael runtime logic", () => {
    expect(clubDashboardSource).not.toMatch(/FC Allschwil|FCA|Michael/);
    expect(workspaceSource).not.toMatch(/FC Allschwil|FCA|Michael/);
  });

  it("does not alter legacy identity hero card on dashboard route", () => {
    expect(identitySource).toContain("backgroundImageUrl");
  });
});
