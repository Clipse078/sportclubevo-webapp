import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07 canonical operational editor parity", () => {
  it("training session edit uses PlanningEditorOperationalWorkspace with integrated primary flow", () => {
    const page = read("app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx");
    expect(page).toContain("PlanningEditorOperationalWorkspace");
    expect(page).toContain("training-session-edit-operational-workspace");
    expect(page).toContain("training-session-edit-allocations-panel");
    expect(page).toContain("training-session-edit-publication-panel");
    expect(page).not.toContain("training-session-edit-workspace-grid");
    expect(page).not.toMatch(/PLANNING_EDITOR_PRIMARY_WORKSPACE_GRID_CLASS[\s\S]*training-session-edit-allocations/);
  });

  it("training publication represents team-season inheritance (no session-local infoboard switch)", () => {
    const section = read("components/admin/training/record/TrainingRecordPublicationSection.tsx");
    expect(section).toContain("PlanningPublicationInheritanceBadge");
    expect(section).toContain("trainingIntro");
    expect(section).toContain("training-record-publication-infoboard-effective");
    expect(section).not.toContain('role="switch"');
    expect(section).toContain("SwitchThumb");
  });

  it("saisonplaner tournament edit wires canonical operational sections", () => {
    const page = read("app/(admin)/dashboard/planner/edit/[eventId]/page.tsx");
    expect(page).toContain("PlannerTournamentOperationalSections");
    const form = read("components/admin/planner/PlannerEntryEditForm.tsx");
    expect(form).toContain("PlanningEditorOperationalWorkspace");
    expect(form).toContain("planner-entry-publication-panel");
    const ops = read("components/admin/planner/PlannerTournamentOperationalSections.tsx");
    const workspace = read("components/admin/planner/PlannerTournamentCanonicalWorkspace.tsx");
    expect(ops).toContain("planner-tournament-work-section");
    expect(ops).toContain("planner-tournament-collaboration-section");
    expect(ops).toContain('contextType="TOURNAMENT"');
    expect(workspace).toContain("turniere-canonical-participants-section");
    expect(workspace).toContain("TournamentResourceAllocationEditor");
    const rail = read("components/admin/planner/PlannerTournamentOperationalRail.tsx");
    expect(rail).toContain("participation-request");
  });

  it("veranstaltung edit composes operational sections inside PlanningEditorOperationalWorkspace", () => {
    const form = read("components/admin/veranstaltungen/VeranstaltungEditForm.tsx");
    expect(form).toContain("operationalPrimarySections");
    expect(form).toContain("operationalRailSections");
    const page = read("app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx");
    expect(page).toContain("veranstaltung-edit-work-section");
    expect(page).toContain("veranstaltung-edit-participation-rail");
    expect(page).toContain("operationalPrimarySections");
  });

  it("match record workspace remains protected canonical reference", () => {
    const workspace = read("components/admin/matchcenter/record/SpieleMatchRecordWorkspace.tsx");
    expect(workspace).toContain("spiele-record-publication-panel");
    expect(workspace).toContain("PlanningEditorWorkSection");
    expect(workspace).toContain("suppressPublicationUI");
  });

  it("no duplicate plus Aufgabe labels in active planning surfaces", () => {
    const surfaces = [
      "app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx",
      "components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx",
      "components/admin/aufgaben/contextual/ContextualTaskCreateTrigger.tsx",
    ];
    for (const file of surfaces) {
      const src = read(file);
      expect(src, file).not.toContain('label="+ Aufgabe"');
    }
  });
});
