import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10_CLOSURE_LEDGER,
  SCE_DESIGN_SYSTEM_10_ORG_BUILDER_FINAL,
  SCE_DESIGN_SYSTEM_10_PO_CLOSURE,
} from "@/lib/design-system/sce-design-system-10-closure-meta";
import {
  SCE_DESIGN_SYSTEM_10_GOVERNANCE,
  SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS,
  SCE_DESIGN_SYSTEM_10_PO_REVIEW,
} from "@/lib/design-system/sce-design-system-10-meta";
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";
import { SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT } from "@/lib/design-system/sce-create-flow-foundation";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10 final closure", () => {
  it("records PO acceptance and programme closure flags", () => {
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.PO_DS10_PRODUCT_WIDE_VISUAL_UAT).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.PO_DS10_ORG_BUILDER_R7_2_VISUAL_UAT).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.PO_DS10_ORG_BUILDER_R7_2_HOVER_RUNTIME_UAT).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.SCE_DESIGN_SYSTEM_10_CLOSED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_PO_REVIEW.DS10_STATUS).toBe("CLOSED / ACCEPTED / MERGED");
    expect(SCE_DESIGN_SYSTEM_10_PO_REVIEW.DS10_PO_VISUAL_UAT).toBe("PASS");
  });

  it("derives zero migration debt from authoritative ledgers", () => {
    expect(SCE_DESIGN_SYSTEM_10_CLOSURE_LEDGER.UNRESOLVED_MIGRATION_DEBT).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10_CLOSURE_LEDGER.REMAINING_LIGHT_FUNCTIONAL_SURFACES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10_CLOSURE_LEDGER.REMAINING_FULL_PAGE_PRIMARY_CREATE_FLOWS).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10_CLOSURE_LEDGER.REMAINING_LEGACY_BINARY_SETTING_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS.UNRESOLVED_MIGRATION_DEBT).toBe(
      SCE_DESIGN_SYSTEM_10_CLOSURE_LEDGER.UNRESOLVED_MIGRATION_DEBT,
    );
  });

  it("preserves Aufgaben workspace acceptance without reopening", () => {
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.SCE_DS10_AUFGABEN_WORKSPACE_ACCEPTED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.PO_DS10_R4_AUFGABEN_VISUAL_UAT).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.PO_DS10_R4_RUNTIME_UAT).toBe("PASS");
  });

  it("locks product-wide design system flags", () => {
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.WORKSPACE_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.BREADCRUMB_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.COMMUNICATION_VISUAL_REFERENCE_PRESERVED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.PRODUCT_WIDE_CREATE_FLOW_MIGRATION_COMPLETE).toBe("YES");
  });

  it("records Organisation Builder final runtime architecture", () => {
    const hook = readSrc("lib/org/use-org-unit-contextual-preview.ts");
    expect(hook).not.toContain("matchMedia");
    expect(hook).not.toMatch(/hover:\s*hover/);
    expect(SCE_DESIGN_SYSTEM_10_ORG_BUILDER_FINAL.FULL_EDIT_FLOW_HISTORY_INTEGRATION).toBe(
      "PARTIAL",
    );
    expect(SCE_DESIGN_SYSTEM_10_ORG_BUILDER_FINAL.EDIT_HISTORY_INFRASTRUCTURE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_ORG_BUILDER_FINAL.DS11_LAYER_GOVERNANCE_FOLLOWUP).toBe("YES");
    expect(readSrc("components/admin/org/OrgUnitContextualPreviewLayer.tsx")).toContain("z-[80]");
  });

  it("passes Toggle First and create-flow representative audit", () => {
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_BINARY_CHECKBOX_COUNTS.REMAINING_LEGACY_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.NEW_BINARY_CHECKBOXES).toBe(0);
    expect(
      SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT.every((row) =>
        row.classification.includes("MODAL_FIRST"),
      ),
    ).toBe(true);
  });

  it("does not start DS-11", () => {
    expect(SCE_DESIGN_SYSTEM_10_PO_CLOSURE.NEXT_PACKAGE).toContain("DS-11 not started");
  });
});
