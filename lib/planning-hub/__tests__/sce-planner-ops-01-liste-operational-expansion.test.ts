import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-PLANNER-OPS-01 Matchcenter-style Liste operational expansion", () => {
  it("Liste rows use shared collapsible operational shell", () => {
    const row = read("components/admin/planning-hub/PlanningHubListeActivityRow.tsx");
    expect(row).toContain("SceMatchCardCollapsibleOperationalDetails");
    expect(row).toContain("PlanningHubListeOperationalPanel");
    expect(row).not.toContain("<PlanningHubListeInlineEditorHost");
    expect(row).not.toContain("WeekplannerPlanningSheet");
  });

  it("operational panel reuses Matchcenter preparation for HOME matches", () => {
    const panel = read("components/admin/planning-hub/PlanningHubListeOperationalPanel.tsx");
    expect(panel).toContain("SpieleManagementMatchPreparationPanel");
    expect(panel).toContain("OperationalDensePanelShell");
    expect(panel).toContain("PlanningSingleResourceAssignment");
    expect(panel).toContain("PlanningHubListeOperationalPanelErrorBoundary");
    expect(panel).not.toContain("WeekplannerActivityIdentityCard");
    expect(panel).not.toContain("WeekplannerActivityEditorInlineFrame");
  });

  it("shared dense panel shell is exported for Matchcenter and Liste", () => {
    const matchPrep = read("components/admin/matchcenter/SpieleManagementMatchPreparationPanel.tsx");
    expect(matchPrep).toContain("OperationalDensePanelShell");
    expect(matchPrep).toContain("PlanningOperationalResourceGroup");
    expect(read("components/admin/shared/planning/OperationalDensePanelShell.tsx")).toContain(
      "SCE_SURFACE_DENSE_PANEL",
    );
  });

  it("inline editor host is session metadata only (no embedded sheet)", () => {
    const host = read("components/admin/planning-hub/PlanningHubListeInlineEditorHost.tsx");
    expect(host).not.toContain("WeekplannerActivityEditorInlineFrame");
    expect(host).not.toContain("<WeekplannerPlanningSheet");
    expect(host).toContain("PlanningHubListeInlineSession");
  });

  it("week planner workspace mounts ToastProvider for Liste training allocation hooks", () => {
    const workspace = read("components/admin/planner/WeekPlannerWorkspace.tsx");
    expect(workspace).toContain("ToastProvider");
    expect(workspace).toMatch(/<ToastProvider>[\s\S]*PlanningHubPlannerWeekProvider/);
  });
});
