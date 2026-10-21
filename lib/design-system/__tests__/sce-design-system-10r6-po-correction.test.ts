import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10R6_ORGANISATION_BUILDER,
  SCE_DESIGN_SYSTEM_10R6_PO,
} from "@/lib/design-system/sce-design-system-10r6-po-correction-meta";
import { ORG_LAYOUT_PERSISTENCE_SCOPE } from "@/lib/org/org-layout-persistence";
import { SCE_DESIGN_SYSTEM_10R5_ORGANISATION_BUILDER } from "@/lib/design-system/sce-design-system-10r5-po-correction-meta";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10R6 Organisation Builder contextual intelligence", () => {
  it("marks R6 ready for PO review without DS-10 closure", () => {
    expect(SCE_DESIGN_SYSTEM_10R6_PO.SCE_DESIGN_SYSTEM_10R6_READY_FOR_PO_REVIEW).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R6_PO.SCE_DESIGN_SYSTEM_10_READY_FOR_CLOSURE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10R6_PO.PO_DS10_ORG_BUILDER_R6_VISUAL_UAT).toBe("PENDING");
  });

  it("locks progressive disclosure and zoom-independent preview", () => {
    expect(SCE_DESIGN_SYSTEM_10R6_ORGANISATION_BUILDER.ORG_NODE_PERMANENT_METADATA).toBe("COMPACT");
    expect(SCE_DESIGN_SYSTEM_10R6_ORGANISATION_BUILDER.ORG_RICH_METADATA_PROGRESSIVE_DISCLOSURE).toBe(
      "YES",
    );
    expect(SCE_DESIGN_SYSTEM_10R6_ORGANISATION_BUILDER.ORG_CONTEXTUAL_PREVIEW_ZOOM_INDEPENDENT).toBe(
      "YES",
    );
    expect(SCE_DESIGN_SYSTEM_10R6_ORGANISATION_BUILDER.ORG_RESPONSIBILITY_SOURCE).toBe(
      "ORG_UNIT_MEMBERSHIP_IS_PRIMARY",
    );
  });

  it("wires canonical preview card and batched enrichment — no hover fetch", () => {
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("OrgUnitContextualPreviewLayer");
    expect(canvas).toContain("useOrgUnitContextualPreview");
    expect(readSrc("components/admin/org/OrgUnitContextualPreviewLayer.tsx")).toContain(
      "data-org-preview-zoom-independent",
    );
    expect(canvas).not.toMatch(/fetch\(.*org-unit.*hover/i);

    expect(readSrc("app/(admin)/dashboard/org-units/page.tsx")).toContain(
      "loadOrgUnitBuilderEnrichment",
    );
    expect(readSrc("components/sce/org/SceOrgUnitPreviewCard.tsx")).toContain(
      "data-org-contextual-preview-root",
    );
  });

  it("preserves R5 hierarchy/presentation separation and interaction locks", () => {
    expect(SCE_DESIGN_SYSTEM_10R5_ORGANISATION_BUILDER.VISUAL_POSITION_DRAG_MUTATES_HIERARCHY).toBe(
      "NO",
    );
    expect(ORG_LAYOUT_PERSISTENCE_SCOPE).toBe("TENANT_SCOPED_PRESENTATION_XY");
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).not.toMatch(/parentId:.*nodeDrag/);
    expect(canvas).toContain("OrgUnitReparentDialog");
  });

  it("passes toggle-first guard", () => {
    expect(SCE_DESIGN_SYSTEM_10R6_PO.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_10R6_PO.NEW_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10R6_PO.CANONICAL_TOGGLES_USED).toBe("YES");
  });
});
