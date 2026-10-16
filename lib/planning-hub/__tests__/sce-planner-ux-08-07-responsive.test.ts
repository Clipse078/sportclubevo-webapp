import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("SCE-PLANNER-UX-08-07 responsive contracts", () => {
  it("shell perspective tabs keep touch-friendly min height", () => {
    const chrome = read("components/admin/planner/WeekPlannerChrome.tsx");
    expect(chrome).toContain("min-h-9");
    expect(chrome).toContain("planning-hub-perspective");
  });

  it("Liste hierarchy and row menu collision settings remain intact", () => {
    const liste = read("components/admin/planning-hub/PlanningHubListeView.tsx");
    expect(liste).toContain("PlanningHubListeActivityRow");
    expect(liste).not.toContain("checkbox");

    const listeRow = read("components/admin/planning-hub/PlanningHubListeActivityRow.tsx");
    expect(listeRow).toContain("PlanningHubListeSceActivityCard");
    expect(listeRow).toContain("PlanningHubActivityDetailSurface");
    expect(listeRow).toContain("SceProgrammeActivityCardShell");

    const menu = read("components/admin/planning-hub/PlanningHubListeRowMenu.tsx");
    expect(menu).toContain("constrainHeight={false}");
    expect(menu).toContain("clipOverflow={false}");
    expect(menu).toContain("h-9 w-9");
  });

  it("activity clipped-detail surface supports keyboard focus and touch trigger", () => {
    const block = read("components/admin/planning-hub/PlanningHubActivityBlock.tsx");
    expect(block).toContain("PlanningHubActivityDetailSurface");
    expect(block).toContain("focus-visible:ring");

    const surface = read("components/admin/planning-hub/PlanningHubActivityDetailSurface.tsx");
    expect(surface).toContain("useFocus");
    expect(surface).toContain("useHover");
    expect(surface).not.toContain("planning-hub-activity-detail-touch-trigger");
    expect(surface).toContain("buildActivityClippedDetailModel");
    expect(surface).toContain("PlannerOperationalStatusSection");
    expect(surface).not.toContain("ring-[var(--sce-primary)]");
    expect(surface).toContain("suppressActivityTypeHeader");
  });

  it("aggregate cluster summary uses Aktivitäten for mixed types", () => {
    const cluster = read("lib/planning-hub/scheduler/aggregate-cluster.ts");
    expect(cluster).toContain("isMixedActivityTypes");
    expect(cluster).toContain("Aktivitäten");
  });

  it("calendar and resource views document intentional horizontal scroll roots", () => {
    const calendar = read("components/admin/planning-hub/PlanningHubCalendarView.tsx");
    expect(calendar).toContain("overflow-x-auto");
    expect(calendar).toContain("data-sce-planner-calendar-scroll-root");

    const resource = read("components/admin/planning-hub/PlanningHubResourceDayView.tsx");
    expect(resource).toContain("data-sce-planner-scroll-root");
    expect(resource).toContain("min-h-9");
  });

  it("popover collision middleware uses fixed strategy and expanded padding", () => {
    const popover = read("components/ui/Popover.tsx");
    expect(popover).toContain('strategy: "fixed"');
    expect(popover).toContain("padding: 12");
  });
});
