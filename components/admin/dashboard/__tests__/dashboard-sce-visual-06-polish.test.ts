import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("SCE-VISUAL-06 — dashboard polish", () => {
  it("keeps 2×2 cockpit with row-aware grid sizing", () => {
    const grid = read("components/ui/dashboard/DashboardCockpitGrid.tsx");
    expect(grid).toContain("md:grid-cols-2");
    expect(grid).toContain("grid-template-rows");
    expect(grid).toContain('data-testid="dashboard-cockpit-grid"');

    const workspace = read("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).toContain("md:row-start-1");
    expect(workspace).toContain("md:row-start-2");
  });

  it("allows row 1 and row 2 to use different grid track heights", () => {
    const grid = read("components/ui/dashboard/DashboardCockpitGrid.tsx");
    const rowsMatch = grid.match(/grid-template-rows:[^"]+/);
    expect(rowsMatch?.[0]).toMatch(/_.*minmax/);
  });

  it("does not force a large shared min-height on cockpit cards", () => {
    const surface = read("lib/dashboard/dashboard-cockpit-surface.ts");
    expect(surface).not.toContain("min-h-[17.5rem]");
    expect(surface).toContain("min-h-0");
  });

  it("uses cockpit empty-state variant for attention and tasks", () => {
    const attention = read("components/ui/dashboard/PersonalAttention.tsx");
    const tasks = read("components/ui/dashboard/PersonalTasksPreview.tsx");
    expect(attention).toContain('variant="cockpit"');
    expect(tasks).toContain('variant="cockpit"');
  });

  it("keeps Schnellzugriff below cockpit and permission-aware", () => {
    const club = read("components/admin/dashboard/ClubDashboardView.tsx");
    const workspaceIndex = club.indexOf("<PersonalDashboardWorkspace");
    const quickIndex = club.indexOf("<PersonalQuickAccess");
    expect(workspaceIndex).toBeGreaterThan(-1);
    expect(quickIndex).toBeGreaterThan(workspaceIndex);
    expect(club).toContain("resolvePersonalQuickAccess");
  });

  it("preserves greeting without injected exclamation", () => {
    const welcome = read("components/ui/dashboard/DashboardCompactWelcome.tsx");
    expect(welcome).not.toContain('after || "!"');
  });

  it("refines calendar day cells without full semantic tint wash", () => {
    const calendarGrid = read("components/ui/calendar/MonthActivityGrid.tsx");
    expect(calendarGrid).not.toContain("dayTintClass");
    expect(calendarGrid).toContain("PersonalProgrammeActivityIndicator");
  });
});
