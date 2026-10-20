import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10_GOVERNANCE,
  SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS,
  SCE_DESIGN_SYSTEM_10_PO_REVIEW,
  SCE_DESIGN_SYSTEM_10_PRODUCT_WIDE_MIGRATION_MATRIX,
  SCE_DESIGN_SYSTEM_10_REPRESENTATIVE_ADOPTION,
} from "@/lib/design-system/sce-design-system-10-meta";
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10 product-wide adoption", () => {
  it("requires migration matrix doc and DS-10 roadmap", () => {
    const matrix = readDoc(
      "docs/design/SCE-DESIGN-SYSTEM-10-PRODUCT-WIDE-MIGRATION-MATRIX.md",
    );
    expect(matrix).toContain("SCE_DESIGN_SYSTEM_10_PRODUCT_WIDE_MIGRATION_MATRIX");
    expect(readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-10.md")).toContain("READY_FOR_PO_REVIEW");
  });

  it("closes product-wide migration gate with zero unresolved debt", () => {
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS.UNRESOLVED_MIGRATION_DEBT).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10_PRODUCT_WIDE_MIGRATION_MATRIX.length).toBeGreaterThan(30);
    expect(SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS.TOTAL_APPLICABLE_SURFACES).toBe(
      SCE_DESIGN_SYSTEM_10_PRODUCT_WIDE_MIGRATION_MATRIX.length,
    );
  });

  it("enforces workspace, breadcrumb, and parallel-system locks", () => {
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.WORKSPACE_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.BREADCRUMB_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.LOCAL_PARALLEL_DENSE_UI_SYSTEMS_ALLOWED).toBe("NO");
  });

  it("records Toggle First compliance after DS-10 sweep", () => {
    expect(SCE_BINARY_CHECKBOX_COUNTS.REMAINING_LEGACY_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_BINARY_CHECKBOX_COUNTS.BINARY_SETTING_CHECKBOXES_DEFERRED).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
  });

  it("wires representative visible adoption sites", () => {
    expect(readSrc("components/admin/shared/AdminSectionHeader.tsx")).toContain(
      "SceWorkspaceHeader",
    );
    expect(readSrc("components/admin/billing/shell/BillingWorkspaceShell.tsx")).toContain(
      "BillingWorkspaceContextTabs",
    );
    expect(readSrc("app/(admin)/dashboard/admin/facilities/page.tsx")).toContain(
      "SceWorkspaceChrome",
    );
    expect(readSrc("components/admin/users/UsersSearchableList.tsx")).toContain("SceDenseSurface");
    expect(SCE_DESIGN_SYSTEM_10_REPRESENTATIVE_ADOPTION.PLATFORM_USERS_DENSE).toContain(
      "SceDense",
    );
  });

  it("does not expose generic Interner Fehler as billing API default", () => {
    expect(readSrc("lib/billing/native-billing-api-errors.ts")).not.toContain(
      '"Interner Fehler."',
    );
  });

  it("remains ready for PO review — not closed", () => {
    expect(SCE_DESIGN_SYSTEM_10_PO_REVIEW.DS10_STATUS).toBe("READY_FOR_PO_REVIEW");
    expect(SCE_DESIGN_SYSTEM_10_PO_REVIEW.NEXT_PACKAGE).toContain("DS-11 not started");
  });
});
