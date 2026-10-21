import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10_GOVERNANCE,
  SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS,
} from "@/lib/design-system/sce-design-system-10-meta";
import {
  SCE_DESIGN_SYSTEM_10R2_GOVERNANCE,
  SCE_DESIGN_SYSTEM_10R2_PO,
} from "@/lib/design-system/sce-design-system-10r2-meta";
import { SCE_DESIGN_SYSTEM_10R2_MIGRATION_DEBT } from "@/lib/design-system/sce-design-system-10r2-migration-debt";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10R2 product-wide convergence", () => {
  it("exposes twelve pre-R2 debt ledger entries — all resolved for engineering closure", () => {
    expect(SCE_DESIGN_SYSTEM_10R2_MIGRATION_DEBT).toHaveLength(12);
    expect(SCE_DESIGN_SYSTEM_10R2_GOVERNANCE.UNRESOLVED_MIGRATION_DEBT).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS.UNRESOLVED_MIGRATION_DEBT).toBe(0);
  });

  it("clears light functional surfaces and keeps PO visual UAT pending", () => {
    expect(SCE_DESIGN_SYSTEM_10R2_GOVERNANCE.REMAINING_LIGHT_FUNCTIONAL_SURFACES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10R2_PO.PO_DS10_PRODUCT_WIDE_VISUAL_UAT).toBe(
      "PENDING_R2_PO_REVIEW",
    );
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE).toBe("NO");
  });

  it("wires planner edit form to SceFormField", () => {
    expect(readSrc("components/admin/planner/PlannerEntryEditForm.tsx")).toContain("SceFormField");
  });

  it("migrates vereinsleitung hub cards off raw bg-white panels", () => {
    const card = readSrc("components/admin/vereinsleitung/VereinsleitungMeetingsCard.tsx");
    expect(card).toContain("VEREINSLEITUNG_PANEL_CLASS");
    expect(card).not.toContain("bg-white");
  });

  it("uses dark workspace on admin integrations and training allocations", () => {
    expect(readSrc("app/(admin)/dashboard/admin/integrations/page.tsx")).toContain(
      "SceWorkspaceChrome",
    );
    expect(readSrc("app/(admin)/dashboard/training/series/[seriesId]/allocations/page.tsx")).toContain(
      "SceFeatureCard",
    );
    expect(
      readSrc("app/(admin)/dashboard/training/series/[seriesId]/allocations/page.tsx"),
    ).not.toContain("bg-white");
  });

  it("uses dark page form surfaces for composer helper", () => {
    expect(readSrc("lib/design-system/sce-composer-form-surface.ts")).not.toContain("bg-white");
  });
});
