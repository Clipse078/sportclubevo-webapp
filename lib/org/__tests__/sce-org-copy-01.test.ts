import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-ORG-COPY-01 Vereinsorganisation wording", () => {
  it("uses product German on the org-units page shell", () => {
    const page = readSrc("app/(admin)/dashboard/org-units/page.tsx");
    expect(page).toContain("Vereinsorganisation");
    expect(page).toContain(
      "Organisationseinheiten, Teams und Verantwortlichkeiten im Verein übersichtlich verwalten.",
    );
    expect(page).not.toContain("Organisation Builder");
    expect(page).not.toMatch(/title=.*OrgUnit/i);
    expect(page).not.toMatch(/description=.*autoritativ/i);
  });

  it("keeps Organigramm/Liste tabs and create trigger copy", () => {
    const workspace = readSrc("components/admin/org/OrgUnitBuilderWorkspace.tsx");
    expect(workspace).toContain("Organigramm");
    expect(workspace).toContain("Liste");
    expect(workspace).toContain("Organisationseinheit erstellen");
    expect(workspace).not.toContain("Organisation Builder");
  });

  it("uses toolbar and search product terminology on the canvas", () => {
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("Organisationseinheit suchen …");
    expect(canvas).toContain("Ansicht einpassen");
    expect(canvas).toContain("Automatisch anordnen");
    expect(canvas).not.toContain("Auto-Layout");
    expect(canvas).not.toContain("Einpassen</span>");
    expect(canvas).not.toMatch(/Zyklus|Tiefenprüfung/i);
  });

  it("aligns list search and empty states", () => {
    const list = readSrc("components/admin/org/OrgUnitSearchableList.tsx");
    expect(list).toContain("Organisationseinheit suchen …");
    expect(list).not.toMatch(/Key oder Typ/i);
  });
});