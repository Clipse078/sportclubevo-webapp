import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clubDashboardSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardView.tsx"),
  "utf8",
);

const clubDashboardDeferredSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardCommandCenter.tsx"),
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

  it("renders attention, programme and tasks via workspace slots", () => {
    expect(clubDashboardDeferredSource).toContain("<PersonalDashboardWorkspace");
    expect(clubDashboardDeferredSource).toContain("attentionSlot=");
    expect(clubDashboardDeferredSource).toContain("tasksSlot=");
    expect(workspaceSource).toContain("PersonalProgrammeFeed");
    expect(workspaceSource).not.toContain("PersonalProgrammeMonthCalendar");
    expect(workspaceSource).toContain("personal-dashboard-attention-section");
    expect(workspaceSource).toContain("personal-dashboard-programme-section");
    expect(workspaceSource).toContain("personal-dashboard-tasks-section");
  });

  it("preserves personalized programme data wiring", () => {
    expect(clubDashboardDeferredSource).toContain("getPersonalCommandCenterData");
    expect(clubDashboardDeferredSource).toContain("programmeFeedGroups");
    expect(clubDashboardDeferredSource).toContain("programmeItems");
    expect(workspaceSource).toContain("DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT");
    expect(workspaceSource).toContain("personal-dashboard-programme-section");
  });

  it("preserves attention and tasks data sources", () => {
    expect(clubDashboardDeferredSource).toContain("<PersonalAttention");
    expect(clubDashboardDeferredSource).toContain("personal.personalAttention.items");
    expect(clubDashboardDeferredSource).toContain("personalTaskPreview");
  });

  it("keeps permission-aware quick access below primary sections", () => {
    const workspaceIndex = clubDashboardDeferredSource.indexOf("<PersonalDashboardWorkspace");
    const quickAccessIndex = clubDashboardDeferredSource.indexOf("<PersonalQuickAccess");
    expect(workspaceIndex).toBeGreaterThan(-1);
    expect(quickAccessIndex).toBeGreaterThan(workspaceIndex);
    expect(clubDashboardDeferredSource).toContain("resolvePersonalQuickAccess");
  });

  it("omits dashboard customize trigger from greeting (DS2-05B-R4)", () => {
    expect(greetingSource).not.toContain("PersonalDashboardCustomizeDialog");
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