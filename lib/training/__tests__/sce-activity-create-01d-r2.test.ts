import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTrainingCreateTabNavigationConfig } from "@/lib/training/training-create-workflow-config";
import {
  resolvePlanningResourceAssignmentKindIconType,
} from "@/components/admin/shared/planning/FacilityResourceIdentity";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01D-R2 — contextual overlay + resource icons", () => {
  it("Wochenplaner Training menu uses overlay trigger, not navigation link", () => {
    const menu = read("components/sce/activity-create/SceActivityCreateMenu.tsx");
    expect(menu).toContain("sce-activity-create-training-overlay");
    expect(menu).toContain("TrainingCreateForm");
    expect(menu).toContain('containerMode="overlay"');
    expect(read("lib/sce/activity-create/activity-create-menu-config.ts")).toContain('overlayKey: "training"');
    expect(menu).toContain("trainingUsesOverlay");
    expect(menu).toContain("successBehavior=\"stay\"");
    expect(menu).toContain("planner-revalidate");
  });

  it("planner week route loads shared training composer surface props", () => {
    const page = read("app/(admin)/dashboard/planner/week/page.tsx");
    expect(page).toContain("buildSceActivityCreateMenuProps");
    expect(page).toContain("trainingComposer={activityCreateMenuProps?.trainingComposer");
  });

  it("page fallback /dashboard/training/new still renders TrainingCreateForm", () => {
    expect(read("app/(admin)/dashboard/training/new/page.tsx")).toContain("TrainingCreateForm");
    expect(read("components/admin/training/TrainingCreateForm.tsx")).toContain("SceActivityComposer");
  });

  it("overlay and page share TrainingCreateForm workflow", () => {
    expect(read("components/sce/activity-create/SceActivityCreateMenu.tsx")).toContain(
      "TrainingCreateForm",
    );
  });

  it("training tabs remain five without Publikation (final Übersicht review)", () => {
    expect(buildTrainingCreateTabNavigationConfig().tabs.map((t) => t.key)).toEqual([
      "team",
      "termin",
      "wiederholung",
      "ressourcen",
      "pruefen",
    ]);
  });

  it("resource rows use shared kind icon mapping", () => {
    expect(resolvePlanningResourceAssignmentKindIconType("pitch_hall")).toBe("FULL_PITCH");
    expect(resolvePlanningResourceAssignmentKindIconType("dressing_room")).toBe("DRESSING_ROOM");
    const form = read("components/admin/training/TrainingCreateForm.tsx");
    expect(form).toContain("PlanningResourceAssignmentKindIcon");
    expect(form).toContain("training-create-pitch-kind-icon");
    expect(form).toContain("training-create-dressing-kind-icon");
    expect(read("components/admin/shared/planning/PlanningSingleResourceAssignment.tsx")).toContain(
      "PlanningResourceAssignmentKindIcon",
    );
  });

  it("training management overlay trigger preserved", () => {
    expect(read("app/(admin)/dashboard/training/page.tsx")).toContain("SceActivityCreateMenu");
  });

  it("no new binary checkboxes in touched Training create surfaces", () => {
    const form = read("components/admin/training/TrainingCreateForm.tsx");
    expect(form).toContain("SwitchToggle");
    expect(form).not.toMatch(/type=["']checkbox["']/);
    expect(read("components/sce/activity-create/SceActivityCreateMenu.tsx")).not.toMatch(
      /type=["']checkbox["']/,
    );
  });

  it("origin context wired for planning surface overlay", () => {
    expect(read("components/sce/activity-create/SceActivityCreateMenu.tsx")).toContain(
      "PLANNING_SURFACE",
    );
    expect(read("components/admin/training/TrainingCreateForm.tsx")).toContain("originContext");
  });
});
