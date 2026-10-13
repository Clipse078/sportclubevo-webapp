import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Veranstaltung create workflow — R1.1 UX cleanup", () => {
  const createForm = read("components/admin/veranstaltungen/VeranstaltungCreateForm.tsx");
  const editPage = read("app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx");

  it("removes post-create placeholder sections from create form", () => {
    expect(createForm).not.toContain("PlanningEditorParticipantsSection");
    expect(createForm).not.toContain("PlanningEditorWorkSection");
    expect(createForm).not.toContain("PlanningEditorCollaborationSection");
    expect(createForm).not.toContain("veranstaltung-create-participants-section");
    expect(createForm).not.toContain("veranstaltung-create-work-section");
    expect(createForm).not.toContain("veranstaltung-create-collaboration-section");
  });

  it("keeps canonical create tabs and persistent actions", () => {
    expect(createForm).toContain("ClubEventCreateWorkflowShell");
    expect(createForm).toContain("PlanningEditorActions");
    expect(createForm).toContain("veranstaltung-create-submit");
    expect(createForm).not.toContain("wizard");
  });

  it("preserves post-create capabilities on edit route", () => {
    expect(editPage).toContain("PlanningEditorParticipantsSection");
    expect(editPage).toContain("PlanningEditorWorkSection");
    expect(editPage).toContain("PlanningEditorCollaborationSection");
    expect(editPage).toContain("veranstaltung-edit-participants-section");
    expect(editPage).toContain("veranstaltung-edit-work-section");
    expect(editPage).toContain("veranstaltung-edit-collaboration-section");
  });
});
