import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const clubDashboardSource = read("components/admin/dashboard/ClubDashboardView.tsx");
const loaderSource = read("lib/dashboard/personal-command-center.ts");
const pageSource = read("app/(admin)/dashboard/page.tsx");

describe("DASHBOARD-07 — programme acceptance closure", () => {
  it("routes /dashboard through personal command center only", () => {
    expect(pageSource).toContain("ClubDashboardView");
    expect(pageSource).not.toContain("getCommandCenterData");
  });

  it("uses canonical loaders for programme, attention, tasks, quick access", () => {
    expect(clubDashboardSource).toContain("getPersonalCommandCenterData");
    expect(clubDashboardSource).toContain("resolvePersonalQuickAccess");
    expect(clubDashboardSource).toContain("formatSecondaryActivityPresentation");
    expect(loaderSource).toContain("loadPersonalProgramme");
    expect(loaderSource).toContain("loadDashboardPersonalWork");
    expect(loaderSource).not.toContain("loadPersonalAgendaItems");
    expect(loaderSource).not.toContain("buildAttentionItems");
  });

  it("isolates secondary snapshot failures", () => {
    expect(loaderSource).toContain("loadSecondarySnapshotSafe");
    expect(loaderSource).toContain("[personal-dashboard] secondary snapshot failed");
  });

  it("does not build reusable German UI strings in secondary loader", () => {
    expect(loaderSource).not.toMatch(/Neue Anmeldung:/);
    expect(loaderSource).not.toMatch(/von \$\{/);
    expect(loaderSource).not.toContain("Newsartikel");
    expect(loaderSource).not.toContain("getEventTypeLabel");
  });

  it("preserves final information hierarchy in composition", () => {
    const welcome = clubDashboardSource.indexOf("DashboardCompactWelcome");
    const quick = clubDashboardSource.indexOf("<PersonalQuickAccess");
    const workspace = clubDashboardSource.indexOf("<PersonalDashboardWorkspace");
    const attention = clubDashboardSource.indexOf("<PersonalAttention");
    const tasks = clubDashboardSource.indexOf("<PersonalTasksPreview");
    const secondary = clubDashboardSource.indexOf("<PersonalDashboardSecondary");

    expect(welcome).toBeLessThan(quick);
    expect(quick).toBeLessThan(workspace);
    expect(workspace).toBeLessThan(attention);
    expect(attention).toBeLessThan(tasks);
    expect(tasks).toBeLessThan(secondary);
  });

  it("has no FCA-specific dashboard runtime logic in lib/dashboard", () => {
    const libDashboard = read("lib/dashboard/personal-command-center.ts");
    expect(libDashboard).not.toMatch(/FC Allschwil/i);
    expect(libDashboard).not.toMatch(/fc-allschwil/i);
  });

  it("documents zero-disclosure suites for dashboard phases", () => {
    const requiredSuites = [
      "lib/dashboard/personal-context/__tests__/personal-context.test.ts",
      "lib/personal-agenda/__tests__/personal-programme.test.ts",
      "lib/personal-agenda/__tests__/event-zero-disclosure.test.ts",
      "lib/dashboard/quick-access/__tests__/persistence-security.test.ts",
      "lib/dashboard/personal-attention/__tests__/load-dashboard-personal-work.test.ts",
      "components/admin/dashboard/__tests__/dashboard-06-composition.test.ts",
      "lib/dashboard/__tests__/dashboard-07-acceptance.test.ts",
    ];
    for (const rel of requiredSuites) {
      expect(existsSync(join(root, rel))).toBe(true);
    }
  });
});
