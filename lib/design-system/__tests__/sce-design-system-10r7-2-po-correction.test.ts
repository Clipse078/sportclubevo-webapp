import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SCE_DESIGN_SYSTEM_10R7_2_ORGANISATION_BUILDER,
  SCE_DESIGN_SYSTEM_10R7_2_PO,
} from "@/lib/design-system/sce-design-system-10r7-2-po-correction-meta";

function readSrc(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10R7.2 Organisation Builder", () => {
  it("locks R7.2 PO metadata", () => {
    expect(SCE_DESIGN_SYSTEM_10R7_2_PO.SCE_DESIGN_SYSTEM_10R7_2_READY_FOR_PO_REVIEW).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R7_2_PO.PO_DS10_ORG_BUILDER_R7_2_VISUAL_UAT).toBe("PENDING");
    expect(SCE_DESIGN_SYSTEM_10R7_2_ORGANISATION_BUILDER.DELETE_UNDO_STRATEGY).toBe("NON_UNDOABLE");
  });

  it("uses pointer-type hover eligibility and event anchor for preview", () => {
    const hook = readSrc("lib/org/use-org-unit-contextual-preview.ts");
    expect(hook).toContain("isPointerEligibleForHoverPreview");
    expect(hook).not.toContain("matchMedia");
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("anchorRectFromElement");
    const layer = readSrc("components/admin/org/OrgUnitContextualPreviewLayer.tsx");
    expect(layer).toContain("openAnchor");
  });

  it("adds undo/redo toolbar controls in canonical order", () => {
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    const searchIdx = canvas.indexOf('data-testid="org-canvas-search"');
    const undoIdx = canvas.indexOf('data-testid="org-canvas-undo"');
    const redoIdx = canvas.indexOf('data-testid="org-canvas-redo"');
    const zoomIdx = canvas.indexOf('data-testid="org-canvas-zoom-out"');
    expect(searchIdx).toBeGreaterThan(-1);
    expect(undoIdx).toBeGreaterThan(searchIdx);
    expect(redoIdx).toBeGreaterThan(undoIdx);
    expect(zoomIdx).toBeGreaterThan(redoIdx);
  });

  it("implements command-based session history", () => {
    expect(readSrc("lib/org/org-builder-command-history.ts")).toContain("OrgBuilderCommandHistory");
    expect(readSrc("components/admin/org/OrgUnitBuilderHistoryContext.tsx")).toContain("pushReparent");
  });
});
