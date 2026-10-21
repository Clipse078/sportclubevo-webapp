import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10R5_ORGANISATION_BUILDER,
  SCE_DESIGN_SYSTEM_10R5_PO,
} from "@/lib/design-system/sce-design-system-10r5-po-correction-meta";
import { ORG_LAYOUT_PERSISTENCE_SCOPE } from "@/lib/org/org-layout-persistence";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10R5 Organisation Builder polish", () => {
  it("marks R5 ready for PO review without DS-10 closure", () => {
    expect(SCE_DESIGN_SYSTEM_10R5_PO.SCE_DESIGN_SYSTEM_10R5_READY_FOR_PO_REVIEW).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R5_PO.SCE_DESIGN_SYSTEM_10_READY_FOR_CLOSURE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10R5_PO.PO_DS10_ORG_BUILDER_R5_VISUAL_UAT).toBe("PENDING");
  });

  it("exposes R5 interaction locks", () => {
    expect(SCE_DESIGN_SYSTEM_10R5_ORGANISATION_BUILDER.ORG_EDITOR_DEDICATED_PLANE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R5_ORGANISATION_BUILDER.VISUAL_POSITION_DRAG_MUTATES_HIERARCHY).toBe(
      "NO",
    );
    expect(SCE_DESIGN_SYSTEM_10R5_ORGANISATION_BUILDER.REPARENT_ACCESSIBLE_ALTERNATIVE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R5_ORGANISATION_BUILDER.ORG_DELETE_SILENT_DESCENDANT_DELETE).toBe(
      "NO",
    );
  });

  it("uses Organigramm product terminology and legibility-aware fit", () => {
    const workspace = readSrc("components/admin/org/OrgUnitBuilderWorkspace.tsx");
    expect(workspace).toContain("Organigramm");
    expect(workspace).not.toMatch(/>\s*Canvas\s*</);

    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("computeOrgLayoutBoundingBox");
    expect(canvas).toContain("computeOrgCanvasFitToView");
    expect(canvas).toContain("saveOrgLayoutPositions");
    expect(canvas).not.toMatch(/parentId:.*nodeDrag/);
    expect(canvas).toContain("data-org-reparent-handle");
    expect(canvas).toContain("OrgUnitReparentDialog");
  });

  it("supports direct child create with prefilled parent via composer", () => {
    const workspace = readSrc("components/admin/org/OrgUnitBuilderWorkspace.tsx");
    expect(workspace).toContain("defaultParentId={createParentId}");
    const card = readSrc("components/admin/org/OrgUnitNodeCard.tsx");
    expect(card).toContain("Untereinheit");
    expect(card).toContain("org-unit-add-child");
  });

  it("provides non-drag reparent and dependency-aware delete in inspector", () => {
    const inspector = readSrc("components/admin/org/OrgUnitInspectorPanel.tsx");
    expect(inspector).toContain("OrgUnitReparentDialog");
    expect(inspector).toContain("OrgUnitBuilderDeleteDialog");
    expect(readSrc("components/admin/org/OrgUnitBuilderDeleteDialog.tsx")).toContain(
      "org-delete-relocate-select",
    );
    expect(readSrc("components/admin/org/OrgUnitBuilderDeleteDialog.tsx")).toContain(
      "Untereinheiten verschieben nach",
    );
  });

  it("keeps presentation XY tenant-scoped and auto-layout hierarchy-safe", () => {
    expect(ORG_LAYOUT_PERSISTENCE_SCOPE).toBe("TENANT_SCOPED_PRESENTATION_XY");
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("Manuelle Knotenpositionen");
    expect(canvas).toContain("persistManual({})");
    const runAutoBody = canvas.match(/function runAutoLayout\(\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
    expect(runAutoBody).toContain("persistManual({})");
    expect(runAutoBody).not.toContain("/api/org-units");
    expect(canvas).toContain("Organisationsstruktur (Eltern-Kind) bleibt unverändert");
  });

  it("passes toggle-first guard for organisation builder", () => {
    expect(SCE_DESIGN_SYSTEM_10R5_PO.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_10R5_PO.NEW_BINARY_CHECKBOXES).toBe(0);
    const orgDir = readSrc("components/admin/org/OrgUnitForm.tsx");
    expect(orgDir).not.toMatch(/type=\"checkbox\"/);
  });
});
