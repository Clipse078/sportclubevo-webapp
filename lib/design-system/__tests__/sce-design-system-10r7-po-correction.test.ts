import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10R7_ORGANISATION_BUILDER,
  SCE_DESIGN_SYSTEM_10R7_PO,
} from "@/lib/design-system/sce-design-system-10r7-po-correction-meta";
import { SCE_DESIGN_SYSTEM_10R6_ORGANISATION_BUILDER } from "@/lib/design-system/sce-design-system-10r6-po-correction-meta";
import { SCE_DESIGN_SYSTEM_10R5_ORGANISATION_BUILDER } from "@/lib/design-system/sce-design-system-10r5-po-correction-meta";
import { ORG_LAYOUT_PERSISTENCE_SCOPE } from "@/lib/org/org-layout-persistence";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10R7 Organisation Builder people experience", () => {
  it("marks R7 ready for PO review without DS-10 closure", () => {
    expect(SCE_DESIGN_SYSTEM_10R7_PO.SCE_DESIGN_SYSTEM_10R7_READY_FOR_PO_REVIEW).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R7_PO.SCE_DESIGN_SYSTEM_10_READY_FOR_CLOSURE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10R7_PO.PO_DS10_ORG_BUILDER_R7_VISUAL_UAT).toBe("PENDING");
  });

  it("locks people-first node and inspector hierarchy", () => {
    expect(SCE_DESIGN_SYSTEM_10R7_ORGANISATION_BUILDER.ORG_NODE_PEOPLE_LIST).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10R7_ORGANISATION_BUILDER.ORG_INSPECTOR_PRIMARY_CONTENT).toBe(
      "PEOPLE_AND_STRUCTURE",
    );
    expect(SCE_DESIGN_SYSTEM_10R7_ORGANISATION_BUILDER.SELECTED_NODE_PREVIEW_DUPLICATION).toBe("NO");
  });

  it("uses batched enrichment and compact preview card", () => {
    expect(readSrc("app/(admin)/dashboard/org-units/page.tsx")).toContain(
      "loadOrgUnitBuilderEnrichment",
    );
    const preview = readSrc("components/sce/org/SceOrgUnitPreviewCard.tsx");
    expect(preview).toContain("Mitarbeitende");
    expect(preview).toContain("Leitung");
    expect(preview).toContain("Alle Mitarbeitenden ansehen");
    expect(readSrc("lib/org/org-unit-people.ts")).toContain("deriveOrgUnitPeopleFromAssignments");
  });

  it("suppresses hover preview for selected node when inspector is open", () => {
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("selectedUnitId: selectedId");
    expect(canvas).toContain("contextualPreview.dismiss()");
  });

  it("preserves R5/R6 interaction and responsibility contracts", () => {
    expect(SCE_DESIGN_SYSTEM_10R5_ORGANISATION_BUILDER.VISUAL_POSITION_DRAG_MUTATES_HIERARCHY).toBe(
      "NO",
    );
    expect(SCE_DESIGN_SYSTEM_10R6_ORGANISATION_BUILDER.ORG_RESPONSIBILITY_SOURCE).toBe(
      "ORG_UNIT_MEMBERSHIP_IS_PRIMARY",
    );
    expect(SCE_DESIGN_SYSTEM_10R6_ORGANISATION_BUILDER.ORG_HOVER_PREVIEW_N_PLUS_ONE).toBe("NO");
    expect(ORG_LAYOUT_PERSISTENCE_SCOPE).toBe("TENANT_SCOPED_PRESENTATION_XY");
  });

  it("passes toggle-first guard", () => {
    expect(SCE_DESIGN_SYSTEM_10R7_PO.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_10R7_PO.NEW_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10R7_PO.CANONICAL_TOGGLES_USED).toBe("YES");
  });
});
