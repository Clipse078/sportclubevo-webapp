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
    expect(liste).toContain("planning-hub-liste-row-time");
    expect(liste).toContain("ActivityTypePill");
    expect(liste).not.toContain("checkbox");

    const menu = read("components/admin/planning-hub/PlanningHubListeRowMenu.tsx");
    expect(menu).toContain("constrainHeight={false}");
    expect(menu).toContain("clipOverflow={false}");
    expect(menu).toContain("h-9 w-9");
  });

  it("activity clipped-detail surface supports keyboard focus and touch trigger", () => {
    const block = read("components/admin/planning-hub/PlanningHubActivityBlock.tsx");
    expect(block).toContain("PlanningHubActivityClippedDetailSurface");
    expect(block).toContain("focus-visible:ring");

    const surface = read("components/admin/planning-hub/PlanningHubActivityClippedDetailSurface.tsx");
    expect(surface).toContain("useFocus");
    expect(surface).toContain("useHover");
    expect(surface).toContain("planning-hub-activity-detail-touch-trigger");
    expect(surface).toContain("buildActivityClippedDetailModel");
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
