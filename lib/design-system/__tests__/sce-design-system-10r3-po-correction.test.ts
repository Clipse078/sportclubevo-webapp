import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10R3_ORGANISATION_BUILDER,
  SCE_DESIGN_SYSTEM_10R3_PO,
  SCE_DESIGN_SYSTEM_10R3_CREATE_FLOW,
} from "@/lib/design-system/sce-design-system-10r3-po-correction-meta";
import { SCE_DESIGN_SYSTEM_10_GOVERNANCE } from "@/lib/design-system/sce-design-system-10-meta";
import { SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT } from "@/lib/design-system/sce-create-flow-foundation";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10R3 PO correction package", () => {
  it("marks R3 ready for PO review without DS-10 closure", () => {
    expect(SCE_DESIGN_SYSTEM_10R3_PO.SCE_DESIGN_SYSTEM_10R3_READY_FOR_PO_REVIEW).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R3_PO.SCE_DESIGN_SYSTEM_10_READY_FOR_CLOSURE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE).toBe("YES");
  });

  it("implements editor-style organisation canvas contracts", () => {
    expect(SCE_DESIGN_SYSTEM_10R3_ORGANISATION_BUILDER.NODE_VISUAL_DRAG).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R3_ORGANISATION_BUILDER.NODE_VISUAL_DRAG_MUTATES_PARENT).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10R3_ORGANISATION_BUILDER.REPARENT_REQUIRES_CONFIRMATION).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R3_ORGANISATION_BUILDER.AUTO_LAYOUT_AVAILABLE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R3_ORGANISATION_BUILDER.FIT_VIEW_LEGIBILITY_GUARD).toBe("YES");

    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("data-org-reparent-handle");
    expect(canvas).toContain("org-canvas-auto-layout");
    expect(canvas).toContain("org-canvas-zoom-level");
    expect(canvas).toContain("computeOrgCanvasFitToView");
    expect(canvas).not.toMatch(/draggable=\{canManage/);
  });

  it("uses separate reparent handle on node card", () => {
    const card = readSrc("components/admin/org/OrgUnitNodeCard.tsx");
    expect(card).toContain("data-org-reparent-handle");
    expect(card).not.toContain("draggable={canManage");
  });

  it("corrects Neuer Verein create-flow truth", () => {
    expect(SCE_DESIGN_SYSTEM_10R3_CREATE_FLOW.NEUER_VEREIN_MODAL_FIRST).toBe("YES");
    expect(readSrc("app/(admin)/dashboard/vereine/page.tsx")).toContain("ClubCreateTrigger");
    expect(readSrc("app/(admin)/dashboard/vereine/new/page.tsx")).toContain('layout="composer"');
    expect(readSrc("app/(admin)/dashboard/vereine/new/page.tsx")).not.toContain("FormPagePattern");
    const auditRow = SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT.find((r) => r.entity === "Neuer Verein");
    expect(auditRow?.canonicalEntry).toContain("ClubCreateComposerDialog");
  });

  it("passes toggle-first binary control compliance", () => {
    expect(SCE_DESIGN_SYSTEM_10R3_PO.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_10R3_PO.REMAINING_LEGACY_BINARY_SETTING_CHECKBOXES).toBe(0);
  });
});
