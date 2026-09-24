import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Veranstaltungen create/edit — PLANNING-UX-04 SCE editor", () => {
  const createPage = join(process.cwd(), "app/(admin)/dashboard/veranstaltungen/new/page.tsx");
  const editPage = join(process.cwd(), "app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx");
  const createForm = join(process.cwd(), "components/admin/veranstaltungen/VeranstaltungCreateForm.tsx");

  it("create route uses PlanningEditorShell and i18n header", () => {
    const source = readFileSync(createPage, "utf8");
    expect(source).toContain("PlanningEditorShell");
    expect(source).toContain("PlanningEditorHeader");
    expect(source).toContain('getTranslations("Veranstaltungen.editor.create")');
    expect(source).not.toContain("AdminSectionHeader");
    expect(source).not.toMatch(/max-w-\[900px\]/);
  });

  it("edit route preserves tenant loader and authorization", () => {
    const source = readFileSync(editPage, "utf8");
    expect(source).toContain("getClubEvent");
    expect(source).toContain("requireAnyPermission");
    expect(source).toContain("PERMISSIONS.EVENTS_MANAGE");
    expect(source).toContain("PlanningEditorShell");
  });

  it("forms drop legacy AdminSurfaceCard shells", () => {
    const source = readFileSync(createForm, "utf8");
    expect(source).toContain("PlanningEditorSection");
    expect(source).not.toContain("AdminSurfaceCard");
  });
});
